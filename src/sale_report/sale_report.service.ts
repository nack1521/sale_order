import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisClientType } from 'redis';
import { OrderLine, OrderLineDocument } from 'src/order_lines/schemas/order_line.schema';
import { SaleOrder, SaleOrderDocument } from 'src/sale_orders/schemas/sale_order.schema';


type Shop = 'lazada' | 'shopee';

@Injectable()
export class SaleReportService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    @InjectModel(OrderLine.name) private orderLineModel: Model<OrderLineDocument>,
    @InjectModel(SaleOrder.name) private saleOrderModel: Model<SaleOrderDocument>,
  ) {}

  private startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0); }
  private endOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999); }
  private round2(n: number) { return Math.round(n * 100) / 100; }

  private dayKeyLocal(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private readonly TZ_MINUTES = 7 * 60;
  private dayKeyTZ(date: Date, tzMinutes = this.TZ_MINUTES) {
    const shiftedMs = date.getTime() + (tzMinutes - date.getTimezoneOffset()) * 60000;
    const shifted = new Date(shiftedMs);
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(shifted.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // Generate and persist reports for a specific day (local time)
  async generateDailyFromRedis(day: Date): Promise<{ orderLines: string[]; saleOrders: string[] }> {
    const from = this.startOfDay(day);
    const to = this.endOfDay(day);
    const dayKey = this.dayKeyTZ(from); // must match PaymentsService

    const shops: Shop[] = ['lazada', 'shopee'];

    // 1) Read sale orders from daily lists
    const ordersByShop: Record<Shop, any[]> = { lazada: [], shopee: [] };
    for (const shop of shops) {
      const listKey = `${shop}_sale_order:${dayKey}`;
      const raw = await this.redis.lRange(listKey, 0, -1);
      const parsed = raw.map(s => { try { return JSON.parse(s); } catch { return null; } }).filter(Boolean);
      ordersByShop[shop] = parsed.filter((o: any) => {
        const t = Number(o.createdAtMs ?? Date.parse(o.createdAtIso ?? o.createdAt));
        return t >= from.getTime() && t <= to.getTime();
      });
    }

    // 2) Read per-product aggregates from daily hashes and persist OrderLine docs
    const orderLineDocs: OrderLineDocument[] = [];
    const orderLineIdsByShopPid: Record<Shop, Map<string, Types.ObjectId>> = {
      lazada: new Map(), shopee: new Map(),
    };

    for (const shop of shops) {
      const hashKey = `${shop}_order_line:${dayKey}`;
      const flat = await this.redis.hGetAll(hashKey);
      // Build map pid -> { qty, total }
      const byPid = new Map<string, { qty: number; total: number }>();
      for (const [field, val] of Object.entries(flat)) {
        const [pid, metric] = field.split(':');
        const entry = byPid.get(pid) ?? { qty: 0, total: 0 };
        if (metric === 'product_quantity') entry.qty += Number(val || 0);
        if (metric === 'total_price') entry.total += Number(val || 0);
        byPid.set(pid, entry);
      }

      if (byPid.size === 0 && ordersByShop[shop].length > 0) {
        throw new BadRequestException(`No order_line data in Redis for ${shop} ${dayKey}`);
      }

      if (byPid.size > 0) {
        const dayStart = this.startOfDay(day);
        const docs = Array.from(byPid.entries()).map(([pid, agg]) => ({
          shop_id: shop,
          product_id: new Types.ObjectId(pid),
          product_quantity: agg.qty,
          total_price: this.round2(agg.total),
          price_per_one_product: agg.qty ? this.round2(agg.total / agg.qty) : 0,
          day: dayStart,
        }));
        const inserted = await this.orderLineModel.insertMany(docs, { ordered: false });
        for (const doc of inserted) {
          orderLineIdsByShopPid[shop].set(String(doc.product_id), doc._id as Types.ObjectId);
          orderLineDocs.push(doc);
        }
      }
    }

    // 3) Upsert ONE SaleOrder doc per shop for the day (aggregate order_ids + order_lines)
    for (const shop of shops) {
      const orders = ordersByShop[shop];
      if (!orders.length) {
        await this.saleOrderModel.deleteMany({ shop_id: shop, day: from });
        continue;
      }

      const orderIds = Array.from(new Set(orders.map(o => String(o.payment_id))));
      const grandTotal = this.round2(orders.reduce((s, o) => s + Number(o.grand_total || 0), 0));
      const uniquePids = Array.from(
        new Set<string>(orders.flatMap(o => (o.product_list || []).map((id: any) => String(id)))),
      );
      const productList = uniquePids.map(id => new Types.ObjectId(id));
      const orderLineIds = Array.from(orderLineIdsByShopPid[shop].values());

      // match schema: [{ order_id: string[] }]
      const orderIdListDoc = [{ order_id: orderIds }];

      await this.saleOrderModel.updateOne(
        { shop_id: shop, day: from },
        {
          $set: {
            shop_id: shop,
            day: from,
            grand_total: grandTotal,
            product_list: productList,
            order_lines: orderLineIds,
            order_id_list: orderIdListDoc, // <-- fix shape
          },
          $setOnInsert: { createdAt: from },
        },
        { upsert: true },
      );
    }

    // Read the two docs to return their ids
    const aggOrders = await this.saleOrderModel.find({ day: from, shop_id: { $in: shops } }, { _id: 1 }).lean();

    // 4) Clear that day’s Redis keys
    await this.redis.del([
      'lazada_sale_order:' + dayKey,
      'shopee_sale_order:' + dayKey,
      'lazada_order_line:' + dayKey,
      'shopee_order_line:' + dayKey,
    ]);

    return {
      orderLines: [], // you can keep returning the created OrderLine ids if you need them
      saleOrders: aggOrders.map(d => String(d._id)),
    };
  }
}

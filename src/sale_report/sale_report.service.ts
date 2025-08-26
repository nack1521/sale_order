import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RedisClientType } from 'redis';
import { OrderLine, OrderLineDocument } from 'src/order_lines/schemas/order_line.schema';
import { Payment, PaymentDocument } from 'src/payments/schemas/payment.schema';
import { Product, ProductDocument } from 'src/products/schemas/product.schemas';
import { SaleOrder, SaleOrderDocument } from 'src/sale_orders/schemas/sale_order.schema';


type Shop = 'lazada' | 'shopee';

@Injectable()
export class SaleReportService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
    @InjectModel(OrderLine.name) private orderLineModel: Model<OrderLineDocument>,
    @InjectModel(SaleOrder.name) private saleOrderModel: Model<SaleOrderDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}
  private readonly TZ_MINUTES = 7 * 60;

  private startOfDay(d: Date) {
     return new Date(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime() + this.TZ_MINUTES * 60000); 
    }
  private endOfDay(d: Date) {
    return new Date(new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime() + this.TZ_MINUTES * 60000);
  }
  private round2(n: number) {
    return Math.round(n * 100) / 100;
  }

  private dayKeyLocal(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  
  private dayKeyTZ(date: Date, tzMinutes = this.TZ_MINUTES) {
    const shiftedMs = date.getTime() + (tzMinutes - date.getTimezoneOffset()) * 60000;
    const shifted = new Date(shiftedMs);
    const y = shifted.getUTCFullYear();
    const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
    const d = String(shifted.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // private rangeForTZ(day: Date, tzMinutes = this.TZ_MINUTES) {
  //   const startLocal = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0);
  //   const endLocal = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  //   const delta = (tzMinutes - startLocal.getTimezoneOffset()) * 60000;
  //   return { from: new Date(startLocal.getTime() - delta), to: new Date(endLocal.getTime() - delta) };
  // }

  // Generate and persist reports for a specific day (local time)
  async generateDailyFromRedis(day: Date): Promise<{ orderLines: string[]; saleOrders: string[] }> {
    const from = this.startOfDay(day);
    const to = this.endOfDay(day);
    const dayKey = this.dayKeyTZ(from); // must match PaymentsService
    console.log('from', from);
    console.log('to', to);
    console.log('dayKey', dayKey);

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

      await this.saleOrderModel.updateOne(
        { shop_id: shop, day: from },
        {
          $set: {
            shop_id: shop,
            day: from,
            grand_total: grandTotal,
            product_list: productList,
            order_lines: orderLineIds,
            order_id_list: orderIds, // <-- fix shape
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
      `lazada_sale_order:${dayKey}`,
      `shopee_sale_order:${dayKey}`,
      `lazada_order_line:${dayKey}`,
      `shopee_order_line:${dayKey}`,
    ]);

    return {
      orderLines: orderLineDocs.map(d => String(d._id)),
      saleOrders: aggOrders.map(d => String(d._id)),
    };
  }

  async generateDailyFromDb(day: Date): Promise<{ orderLines: string[]; saleOrders: string[] }> {
    const from = this.startOfDay(day);
    console.log('from', from);
    const to = this.endOfDay(day);
    console.log('to', to);
    const shops: Shop[] = ['lazada', 'shopee'];

    // 1) Load payments for the day (both shops)
    const payments = await this.paymentModel.find(
      { createdAt: { $gte: from, $lte: to }, shop_id: { $in: shops } },
      { _id: 1, shop_id: 1, grand_total: 1, product_list: 1, createdAt: 1 },
    ).lean();

    // Fast exit: nothing to do
    if (!payments.length) {
      await this.saleOrderModel.deleteMany({ day: from, shop_id: { $in: shops } });
      await this.orderLineModel.deleteMany({ day: from, shop_id: { $in: shops } });
      return { orderLines: [], saleOrders: [] };
    }

    // 2) Build price map for all products in these payments
    const allPids = Array.from(
      new Set<string>(payments.flatMap(p => (p.product_list || []).map((id: any) => String(id))))
    );
    const prods = allPids.length
      ? await this.productModel.find(
          { _id: { $in: allPids.map(id => new Types.ObjectId(id)) } },
          { _id: 1, total_price: 1 },
        ).lean()
      : [];
    const priceById = new Map<string, number>(
      prods.map(p => [String(p._id), Number((p as any).total_price ?? 0)])
    );

    // 3) Per-product aggregates and OrderLine inserts (mirror Redis flow)
    const orderLineDocs: OrderLineDocument[] = [];
    const orderLineIdsByShopPid: Record<Shop, Map<string, Types.ObjectId>> = {
      lazada: new Map(), shopee: new Map(),
    };

    for (const shop of shops) {
      const shopPays = payments.filter(p => String(p.shop_id).toLowerCase() === shop);

      // Build map pid -> { qty, total }
      const byPid = new Map<string, { qty: number; total: number }>();
      for (const pay of shopPays) {
        for (const pidAny of pay.product_list || []) {
          const pid = String(pidAny);
          const unit = priceById.get(pid) ?? 0;
          const acc = byPid.get(pid) ?? { qty: 0, total: 0 };
          acc.qty += 1;
          acc.total += unit;
          byPid.set(pid, acc);
        }
      }

      if (byPid.size === 0 && shopPays.length > 0) {
        throw new BadRequestException(`No order_line data in DB for ${shop} ${this.dayKeyLocal(from)}`);
      }

      if (byPid.size > 0) {
        const docs = Array.from(byPid.entries()).map(([pid, agg]) => ({
          shop_id: shop,
          product_id: new Types.ObjectId(pid),
          product_quantity: agg.qty,
          total_price: this.round2(agg.total),
          price_per_one_product: agg.qty ? this.round2(agg.total / agg.qty) : 0,
          day: from,
        }));
        const inserted = await this.orderLineModel.insertMany(docs, { ordered: false });
        for (const doc of inserted) {
          orderLineIdsByShopPid[shop].set(String(doc.product_id), doc._id as Types.ObjectId);
          orderLineDocs.push(doc);
        }
      }
    }

    // 4) Upsert ONE SaleOrder doc per shop/day (aggregate order_ids + order_lines)
    for (const shop of shops) {
      const shopPays = payments.filter(p => String(p.shop_id).toLowerCase() === shop);
      if (!shopPays.length) {
        await this.saleOrderModel.deleteMany({ shop_id: shop, day: from });
        continue;
      }

      const orderIds = Array.from(new Set(shopPays.map(o => String(o._id))));
      const grandTotal = this.round2(shopPays.reduce((s, o) => s + Number(o.grand_total || 0), 0));
      const uniquePids = Array.from(
        new Set<string>(shopPays.flatMap(o => (o.product_list || []).map((id: any) => String(id))))
      );
      const productList = uniquePids.map(id => new Types.ObjectId(id));
      const orderLineIds = Array.from(orderLineIdsByShopPid[shop].values());

      await this.saleOrderModel.updateOne(
        { shop_id: shop, day: from },
        {
          $set: {
            shop_id: shop,
            day: from,
            grand_total: grandTotal,
            product_list: productList,
            order_lines: orderLineIds,
            order_id_list: orderIds, // plain string[]
          },
          $setOnInsert: { createdAt: from },
        },
        { upsert: true },
      );
    }

    // 5) Return ids like Redis version
    const aggOrders = await this.saleOrderModel.find(
      { day: from, shop_id: { $in: shops } },
      { _id: 1 },
    ).lean();

    return {
      orderLines: orderLineDocs.map(d => String(d._id)),
      saleOrders: aggOrders.map(d => String(d._id)),
    };
  }
}

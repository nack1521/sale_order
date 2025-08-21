import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { faker } from '@faker-js/faker/locale/zh_TW';
import { Product, ProductDocument } from 'src/products/schemas/product.schemas';
import { RedisClientType } from 'redis';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    try {
      const createdPayment = new this.paymentModel(createPaymentDto);
      const saved = await createdPayment.save();
      await this.cachePaymentToRedis(saved); // cache each created payment
      return saved;
    } catch (error) {
      throw new BadRequestException('Failed to create payment: ' + error.message);
    }
  }

  async findAll(queryDto?: QueryPaymentDto): Promise<Payment[]> {
    const filter: any = {};
    
    if (queryDto?.shop_id) {
      filter.shop_id = queryDto.shop_id;
    }
    
    if (queryDto?.minAmount !== undefined || queryDto?.maxAmount !== undefined) {
      filter.amount = {};
      if (queryDto.minAmount !== undefined) {
        filter.amount.$gte = queryDto.minAmount;
      }
      if (queryDto.maxAmount !== undefined) {
        filter.amount.$lte = queryDto.maxAmount;
      }
    }
    
    if (queryDto?.product) {
      filter.product_list = { $in: [queryDto.product] };
    }
    
    if (queryDto?.createdAfter || queryDto?.createdBefore) {
      filter.createdAt = {};
      if (queryDto.createdAfter) {
        filter.createdAt.$gte = new Date(queryDto.createdAfter);
      }
      if (queryDto.createdBefore) {
        filter.createdAt.$lte = new Date(queryDto.createdBefore);
      }
    }

    const page = parseInt(queryDto?.page || '1');
    const limit = parseInt(queryDto?.limit || '10');
    const skip = (page - 1) * limit;

    return await this.paymentModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Payment> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async update(id: string, updatePaymentDto: UpdatePaymentDto): Promise<Payment> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const updatedPayment = await this.paymentModel
      .findByIdAndUpdate(id, updatePaymentDto, { new: true })
      .exec();
      
    if (!updatedPayment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return updatedPayment;
  }

  async remove(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const result = await this.paymentModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
  }

  async findByShopId(shopId: string): Promise<Payment[]> {
    return await this.paymentModel.find({ shop_id: shopId }).exec();
  }

  async getTotalAmountByShop(shopId: string): Promise<number> {
    const result = await this.paymentModel.aggregate([
      { $match: { shop_id: shopId } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    return result.length > 0 ? result[0].total : 0;
  }

  async count(queryDto?: QueryPaymentDto): Promise<number> {
    const filter: any = {};
    
    if (queryDto?.shop_id) {
      filter.shop_id = queryDto.shop_id;
    }
    
    return await this.paymentModel.countDocuments(filter).exec();
  }

  async createDummyPayments(count: number): Promise<Payment[]> {
    // Load only _id and price once
    const products = await this.productModel.find({}, { _id: 1, total_price: 1 }).lean();
    if (products.length === 0) {
      throw new BadRequestException('No products found to reference in payments.');
    }

    type Item = { _id: any; total_price?: number };
    const items = products as Item[];

    // Pick 1–3 distinct indices
    const pickIndices = (): number[] => {
      const howMany = faker.number.int({ min: 1, max: 12 });
      const chosen = new Set<number>();
      while (chosen.size < Math.min(howMany, items.length)) {
        chosen.add(faker.number.int({ min: 0, max: items.length - 1 }));
      }
      return Array.from(chosen);
    };

    const round2 = (n: number) => Math.round(n * 100) / 100;

    // 0-based month: 7 = August
    const startOfDay = new Date(2025, 7, 21, 0, 0, 0, 0);
    const endOfDay = new Date(2025, 7, 21, 23, 59, 59, 999);

    const docs = Array.from({ length: count }, () => {
      const idxs = pickIndices();
      const productIds = idxs.map(i => items[i]._id);
      const total = round2(
        idxs.reduce((sum, i) => sum + Number(items[i].total_price ?? 0), 0),
      );

      return {
        product_list: productIds,
        grand_total: total,
        shop_id: faker.helpers.arrayElement(['lazada', 'shopee']),
        createdAt: faker.date.between({ from: startOfDay, to: endOfDay }),
      };
    });

    const saved = await this.paymentModel.insertMany(docs, { ordered: false });

    // Batch cache to Redis
    const multi = this.redis.multi();
    for (const payment of saved) {
      const shop = String(payment.shop_id).toLowerCase() === 'lazada' ? 'lazada' : 'shopee';
      const listKey = `${shop}_sale_order`;
      const orderLineKey = `${shop}_order_line`;

      const payload = {
        id: String(payment._id),
        grand_total: Number(payment.grand_total ?? 0),
        product_list: (payment.product_list || []).map((id: any) => String(id)),
        createdAt: payment.createdAt ? new Date(payment.createdAt).toISOString() : new Date().toISOString(),
      };

      multi.lPush(listKey, JSON.stringify(payload));
      for (const pid of payload.product_list) {
        multi.hIncrBy(orderLineKey, pid, 1);
      }
    }
    try {
      await multi.exec();
    } catch (e) {
      console.error('Redis batch write failed:', e);
    }

    return saved;
  }

  private async cachePaymentToRedis(payment: any) {
    const shop = String(payment.shop_id).toLowerCase() === 'lazada' ? 'lazada' : 'shopee';
    const listKey = `${shop}_sale_order`;
    const orderLineKey = `${shop}_order_line`;

    const payload = {
      id: String(payment._id),
      grand_total: Number(payment.grand_total ?? 0),
      product_list: (payment.product_list || []).map((id: any) => String(id)),
      createdAt: payment.createdAt ? new Date(payment.createdAt).toISOString() : new Date().toISOString(),
    };

    const multi = this.redis.multi();
    multi.lPush(listKey, JSON.stringify(payload));
    for (const pid of payload.product_list) {
      multi.hIncrBy(orderLineKey, pid, 1);
    }
    try {
      await multi.exec();
    } catch (e) {
      console.error('Redis single write failed:', e);
    }
  }
}

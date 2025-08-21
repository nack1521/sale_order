import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { CreateOrderLineDto } from './dto/create-order_line.dto';
import { UpdateOrderLineDto } from './dto/update-order_line.dto';
import { QueryOrderLineDto } from './dto/query-order_line.dto';
import { OrderLine, OrderLineDocument } from './schemas/order_line.schema';

@Injectable()
export class OrderLinesService {
  constructor(
    @InjectModel(OrderLine.name) private orderLineModel: Model<OrderLineDocument>
  ) {}

  async create(createOrderLineDto: CreateOrderLineDto): Promise<OrderLine> {
    try {
      const createdOrderLine = new this.orderLineModel(createOrderLineDto);
      return await createdOrderLine.save();
    } catch (error) {
      throw new BadRequestException('Failed to create order line: ' + error.message);
    }
  }

  async findAll(queryDto?: QueryOrderLineDto): Promise<OrderLine[]> {
    const filter: any = {};
    
    if (queryDto?.product_id) {
      filter.product_id = queryDto.product_id;
    }
    
    if (queryDto?.minQuantity !== undefined || queryDto?.maxQuantity !== undefined) {
      filter.product_quantity = {};
      if (queryDto.minQuantity !== undefined) {
        filter.product_quantity.$gte = queryDto.minQuantity;
      }
      if (queryDto.maxQuantity !== undefined) {
        filter.product_quantity.$lte = queryDto.maxQuantity;
      }
    }
    
    if (queryDto?.minTotalPrice !== undefined || queryDto?.maxTotalPrice !== undefined) {
      filter.total_price = {};
      if (queryDto.minTotalPrice !== undefined) {
        filter.total_price.$gte = queryDto.minTotalPrice;
      }
      if (queryDto.maxTotalPrice !== undefined) {
        filter.total_price.$lte = queryDto.maxTotalPrice;
      }
    }
    
    if (queryDto?.minPricePerProduct !== undefined || queryDto?.maxPricePerProduct !== undefined) {
      filter.price_per_one_product = {};
      if (queryDto.minPricePerProduct !== undefined) {
        filter.price_per_one_product.$gte = queryDto.minPricePerProduct;
      }
      if (queryDto.maxPricePerProduct !== undefined) {
        filter.price_per_one_product.$lte = queryDto.maxPricePerProduct;
      }
    }

    const page = parseInt(queryDto?.page || '1');
    const limit = parseInt(queryDto?.limit || '10');
    const skip = (page - 1) * limit;

    return await this.orderLineModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<OrderLine> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const orderLine = await this.orderLineModel.findById(id).exec();
    if (!orderLine) {
      throw new NotFoundException(`Order line with ID ${id} not found`);
    }
    return orderLine;
  }

  async update(id: string, updateOrderLineDto: UpdateOrderLineDto): Promise<OrderLine> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const updatedOrderLine = await this.orderLineModel
      .findByIdAndUpdate(id, updateOrderLineDto, { new: true })
      .exec();
      
    if (!updatedOrderLine) {
      throw new NotFoundException(`Order line with ID ${id} not found`);
    }
    return updatedOrderLine;
  }

  async remove(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const result = await this.orderLineModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Order line with ID ${id} not found`);
    }
  }

  async findByProductId(productId: string): Promise<OrderLine[]> {
    return await this.orderLineModel.find({ product_id: productId }).exec();
  }

  async getTotalRevenueByProduct(productId: string): Promise<number> {
    const result = await this.orderLineModel.aggregate([
      { $match: { product_id: productId } },
      { $group: { _id: null, total: { $sum: '$total_price' } } }
    ]);
    
    return result.length > 0 ? result[0].total : 0;
  }

  async count(queryDto?: QueryOrderLineDto): Promise<number> {
    const filter: any = {};
    
    if (queryDto?.product_id) {
      filter.product_id = queryDto.product_id;
    }
    
    return await this.orderLineModel.countDocuments(filter).exec();
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { CreateSaleOrderDto } from './dto/create-sale_order.dto';
import { UpdateSaleOrderDto } from './dto/update-sale_order.dto';
import { QuerySaleOrderDto } from './dto/query-sale_order.dto';
import { SaleOrder, SaleOrderDocument } from './schemas/sale_order.schema';

@Injectable()
export class SaleOrdersService {
  constructor(
    @InjectModel(SaleOrder.name) private saleOrderModel: Model<SaleOrderDocument>
  ) {}

  async create(createSaleOrderDto: CreateSaleOrderDto): Promise<SaleOrder> {
    try {
      const createdSaleOrder = new this.saleOrderModel(createSaleOrderDto);
      return await createdSaleOrder.save();
    } catch (error) {
      throw new BadRequestException('Failed to create sale order: ' + error.message);
    }
  }

  async findAll(queryDto?: QuerySaleOrderDto): Promise<SaleOrder[]> {
    const filter: any = {};
    
    if (queryDto?.shop_id) {
      filter.shop_id = queryDto.shop_id;
    }
    
    if (queryDto?.order_line_id) {
      filter['order_lines.order_line_id'] = queryDto.order_line_id;
    }
    
    if (queryDto?.product_id) {
      filter['order_lines.product_id'] = queryDto.product_id;
    }
    
    if (queryDto?.order_id) {
      filter['order_id_list.order_id'] = queryDto.order_id;
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

    return await this.saleOrderModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<SaleOrder> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const saleOrder = await this.saleOrderModel.findById(id).exec();
    if (!saleOrder) {
      throw new NotFoundException(`Sale order with ID ${id} not found`);
    }
    return saleOrder;
  }

  async update(id: string, updateSaleOrderDto: UpdateSaleOrderDto): Promise<SaleOrder> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const updatedSaleOrder = await this.saleOrderModel
      .findByIdAndUpdate(id, updateSaleOrderDto, { new: true })
      .exec();
      
    if (!updatedSaleOrder) {
      throw new NotFoundException(`Sale order with ID ${id} not found`);
    }
    return updatedSaleOrder;
  }

  async remove(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const result = await this.saleOrderModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Sale order with ID ${id} not found`);
    }
  }

  async findByShopId(shopId: string): Promise<SaleOrder[]> {
    return await this.saleOrderModel.find({ shop_id: shopId }).exec();
  }

  async count(queryDto?: QuerySaleOrderDto): Promise<number> {
    const filter: any = {};
    
    if (queryDto?.shop_id) {
      filter.shop_id = queryDto.shop_id;
    }
    
    return await this.saleOrderModel.countDocuments(filter).exec();
  }
}

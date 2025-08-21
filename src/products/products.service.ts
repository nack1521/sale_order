import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { Product, ProductDocument } from './schemas/product.schemas';
import { faker } from '@faker-js/faker/locale/zu_ZA';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    try {
      const createdProduct = new this.productModel(createProductDto);
      return await createdProduct.save();
    } catch (error) {
      throw new BadRequestException('Failed to create product: ' + error.message);
    }
  }

  async findAll(queryDto?: QueryProductDto): Promise<Product[]> {
    const filter: any = {};
    
    if (queryDto?.product_name) {
      filter.product_name = { $regex: queryDto.product_name, $options: 'i' };
    }
    
    if (queryDto?.minQuantity !== undefined || queryDto?.maxQuantity !== undefined) {
      filter.quantity = {};
      if (queryDto.minQuantity !== undefined) {
        filter.quantity.$gte = queryDto.minQuantity;
      }
      if (queryDto.maxQuantity !== undefined) {
        filter.quantity.$lte = queryDto.maxQuantity;
      }
    }
    
    if (queryDto?.minPrice !== undefined || queryDto?.maxPrice !== undefined) {
      filter.total_price = {};
      if (queryDto.minPrice !== undefined) {
        filter.total_price.$gte = queryDto.minPrice;
      }
      if (queryDto.maxPrice !== undefined) {
        filter.total_price.$lte = queryDto.maxPrice;
      }
    }

    const page = parseInt(queryDto?.page || '1');
    const limit = parseInt(queryDto?.limit || '10');
    const skip = (page - 1) * limit;

    return await this.productModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string): Promise<Product> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const product = await this.productModel.findById(id).exec();
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const updatedProduct = await this.productModel
      .findByIdAndUpdate(id, updateProductDto, { new: true })
      .exec();
      
    if (!updatedProduct) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid ID format');
    }
    
    const result = await this.productModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
  }

  async searchByName(name: string): Promise<Product[]> {
    return await this.productModel
      .find({ product_name: { $regex: name, $options: 'i' } })
      .exec();
  }

  async count(queryDto?: QueryProductDto): Promise<number> {
    const filter: any = {};
    
    if (queryDto?.product_name) {
      filter.product_name = { $regex: queryDto.product_name, $options: 'i' };
    }
    
    return await this.productModel.countDocuments(filter).exec();
  }

  async createDummyProducts(count: number): Promise<Product[]> {
    const products: Product[] = [];
    for (let i = 0; i < count; i++) {
      const product = new this.productModel({
        product_name: faker.commerce.productName(),
        quantity: faker.number.int({ min: 99999, max: 999999 }),
        total_price: faker.commerce.price(),
      });
      products.push(await product.save());
    }
    return products;
  }
}

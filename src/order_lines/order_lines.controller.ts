import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { OrderLinesService } from './order_lines.service';
import { CreateOrderLineDto } from './dto/create-order_line.dto';
import { UpdateOrderLineDto } from './dto/update-order_line.dto';
import { QueryOrderLineDto } from './dto/query-order_line.dto';

@Controller('order-lines')
export class OrderLinesController {
  constructor(private readonly orderLinesService: OrderLinesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOrderLineDto: CreateOrderLineDto) {
    return await this.orderLinesService.create(createOrderLineDto);
  }

  @Get()
  async findAll(@Query() queryDto: QueryOrderLineDto) {
    return await this.orderLinesService.findAll(queryDto);
  }

  @Get('count')
  async count(@Query() queryDto: QueryOrderLineDto) {
    return { count: await this.orderLinesService.count(queryDto) };
  }

  @Get('product/:productId')
  async findByProductId(@Param('productId') productId: string) {
    return await this.orderLinesService.findByProductId(productId);
  }

  @Get('product/:productId/revenue')
  async getTotalRevenueByProduct(@Param('productId') productId: string) {
    const total = await this.orderLinesService.getTotalRevenueByProduct(productId);
    return { productId, totalRevenue: total };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.orderLinesService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateOrderLineDto: UpdateOrderLineDto) {
    return await this.orderLinesService.update(id, updateOrderLineDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return await this.orderLinesService.remove(id);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { SaleOrdersService } from './sale_orders.service';
import { CreateSaleOrderDto } from './dto/create-sale_order.dto';
import { UpdateSaleOrderDto } from './dto/update-sale_order.dto';
import { QuerySaleOrderDto } from './dto/query-sale_order.dto';

@Controller('sale-orders')
export class SaleOrdersController {
  constructor(private readonly saleOrdersService: SaleOrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSaleOrderDto: CreateSaleOrderDto) {
    return await this.saleOrdersService.create(createSaleOrderDto);
  }

  @Get()
  async findAll(@Query() queryDto: QuerySaleOrderDto) {
    return await this.saleOrdersService.findAll(queryDto);
  }

  @Get('count')
  async count(@Query() queryDto: QuerySaleOrderDto) {
    return { count: await this.saleOrdersService.count(queryDto) };
  }

  @Get('shop/:shopId')
  async findByShopId(@Param('shopId') shopId: string) {
    return await this.saleOrdersService.findByShopId(shopId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.saleOrdersService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateSaleOrderDto: UpdateSaleOrderDto) {
    return await this.saleOrdersService.update(id, updateSaleOrderDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return await this.saleOrdersService.remove(id);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPaymentDto: CreatePaymentDto) {
    return await this.paymentsService.create(createPaymentDto);
  }

  @Get()
  async findAll(@Query() queryDto: QueryPaymentDto) {
    return await this.paymentsService.findAll(queryDto);
  }

  @Post('dummy')
  async createDummyPayments(@Body('count') count: number) {
    return await this.paymentsService.createDummyPayments(count);
  }

  @Get('count')
  async count(@Query() queryDto: QueryPaymentDto) {
    return { count: await this.paymentsService.count(queryDto) };
  }

  @Get('shop/:shopId')
  async findByShopId(@Param('shopId') shopId: string) {
    return await this.paymentsService.findByShopId(shopId);
  }

  @Get('shop/:shopId/total')
  async getTotalAmountByShop(@Param('shopId') shopId: string) {
    const total = await this.paymentsService.getTotalAmountByShop(shopId);
    return { shopId, totalAmount: total };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.paymentsService.findOne(id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updatePaymentDto: UpdatePaymentDto) {
    return await this.paymentsService.update(id, updatePaymentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return await this.paymentsService.remove(id);
  }
}

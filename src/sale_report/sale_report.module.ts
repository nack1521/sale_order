import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SaleReportService } from './sale_report.service';
import { RedisModule } from '../redis/redis.module';
import { OrderLine, OrderLineSchema } from 'src/order_lines/schemas/order_line.schema';
import { SaleOrder, SaleOrderSchema } from 'src/sale_orders/schemas/sale_order.schema';
import { SaleReportController } from './sale_report.controller';

@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([
      { name: OrderLine.name, schema: OrderLineSchema },
      { name: SaleOrder.name, schema: SaleOrderSchema },
    ]),
  ],
  controllers: [SaleReportController],
  providers: [SaleReportService],
  exports: [SaleReportService],
})
export class SaleReportModule {}

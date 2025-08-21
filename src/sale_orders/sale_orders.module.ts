import { Module } from '@nestjs/common';
import { SaleOrdersService } from './sale_orders.service';
import { SaleOrdersController } from './sale_orders.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { SaleOrder, SaleOrderSchema } from './schemas/sale_order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SaleOrder.name, schema: SaleOrderSchema }])
  ],
  controllers: [SaleOrdersController],
  providers: [SaleOrdersService],
  exports: [SaleOrdersService]
})
export class SaleOrdersModule {}

import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { SaleOrdersModule } from './sale_orders/sale_orders.module';
import { OrderLinesModule } from './order_lines/order_lines.module';
import { SaleReportModule } from './sale_report/sale_report.module';
import { RedisModule } from './redis/redis.module';


@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb://localhost/27017',
      { dbName: 'sale-report' }
    ),
    PaymentsModule,
    ProductsModule,
    SaleOrdersModule,
    OrderLinesModule,
    SaleReportModule,
    RedisModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

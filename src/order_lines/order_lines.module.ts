import { Module } from '@nestjs/common';
import { OrderLinesService } from './order_lines.service';
import { OrderLinesController } from './order_lines.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderLine, OrderLineSchema } from './schemas/order_line.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OrderLine.name, schema: OrderLineSchema }])
  ],
  controllers: [OrderLinesController],
  providers: [OrderLinesService],
  exports: [OrderLinesService]
})
export class OrderLinesModule {}

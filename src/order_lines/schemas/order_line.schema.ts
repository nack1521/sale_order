import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderLineDocument = OrderLine & Document;

@Schema({
    timestamps: true,
})
export class OrderLine {
  @Prop({ required: true })
  product_id: string;

  @Prop({ required: true })
  product_quantity: number;

  @Prop({ required: true })
  total_price: number;

  @Prop({ required: true })
  price_per_one_product: number;
}

export const OrderLineSchema = SchemaFactory.createForClass(OrderLine);

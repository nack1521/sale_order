import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({
    timestamps: true,
})
export class Payment {
  @Prop({ required: true })
  grand_total: number;

  @Prop({ required: true })
  product_list: string[];

  @Prop({ required: true })
  shop_id: string;

  createdAt?: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

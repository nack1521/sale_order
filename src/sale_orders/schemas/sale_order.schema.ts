import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { OrderLine } from 'src/order_lines/schemas/order_line.schema';

export type SaleOrderDocument = SaleOrder & Document;

@Schema({
    timestamps: true,
})
export class SaleOrder {
  @Prop({ required: true })
  shop_id: string;

  @Prop({ 
    type: [Types.ObjectId], 
    ref: 'OrderLine', default: [] 
  }) 
  order_lines: Types.ObjectId[];

  @Prop({
    type: [
        {
            order_id: { type: [String], required: true }
        }
    ]
  })
  order_id_list: { order_id: string[] }[];

  @Prop({ required: true }) 
  day: Date;
}

export const SaleOrderSchema = SchemaFactory.createForClass(SaleOrder);

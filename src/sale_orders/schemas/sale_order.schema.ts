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
    type: [
        {
            order_line_id: { type: Types.ObjectId, required: true },
            product_id: { type: Types.ObjectId, required: true }
        }
    ]})
  order_lines: { order_line_id: Types.ObjectId, product_id: Types.ObjectId}[];

  @Prop({
    type: [
        {
            order_id: { type: Types.ObjectId, required: true }
        }
    ]
  })
  order_id_list: { order_id: Types.ObjectId }[];

}

export const SaleOrderSchema = SchemaFactory.createForClass(SaleOrder);

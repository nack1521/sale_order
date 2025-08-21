import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({
    timestamps: true,
})
export class Product {
    @Prop({ required: true })
    product_name: string;

    @Prop({ required: true })
    quantity: number;

    @Prop({ required: true })
    total_price: number;

}

export const ProductSchema = SchemaFactory.createForClass(Product);

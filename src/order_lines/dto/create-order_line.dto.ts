import { IsNotEmpty, IsNumber, IsString, IsPositive } from 'class-validator';

export class CreateOrderLineDto {
  @IsNotEmpty()
  @IsString()
  product_id: string;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  product_quantity: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  total_price: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  price_per_one_product: number;
}

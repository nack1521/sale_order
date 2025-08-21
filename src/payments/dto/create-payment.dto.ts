import { IsNotEmpty, IsNumber, IsArray, IsString, IsPositive } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  product_list: string[];

  @IsNotEmpty()
  @IsString()
  shop_id: string;
}

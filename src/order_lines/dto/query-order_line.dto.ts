import { IsOptional, IsString, IsNumber, IsNumberString, IsMongoId } from 'class-validator';

export class QueryOrderLineDto {
  @IsOptional()
  @IsMongoId()
  product_id?: string;

  @IsOptional()
  @IsNumber()
  minQuantity?: number;

  @IsOptional()
  @IsNumber()
  maxQuantity?: number;

  @IsOptional()
  @IsNumber()
  minTotalPrice?: number;

  @IsOptional()
  @IsNumber()
  maxTotalPrice?: number;

  @IsOptional()
  @IsNumber()
  minPricePerProduct?: number;

  @IsOptional()
  @IsNumber()
  maxPricePerProduct?: number;

  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

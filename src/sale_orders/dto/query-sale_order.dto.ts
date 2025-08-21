import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QuerySaleOrderDto {
  @IsOptional()
  @IsString()
  shop_id?: string;

  @IsOptional()
  @IsString()
  order_line_id?: string;

  @IsOptional()
  @IsString()
  product_id?: string;

  @IsOptional()
  @IsString()
  order_id?: string;

  @IsOptional()
  @IsDateString()
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  createdBefore?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
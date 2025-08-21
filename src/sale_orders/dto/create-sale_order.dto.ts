import { IsNotEmpty, IsString, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderLineItemDto {
  @IsNotEmpty()
  @IsMongoId()
  order_line_id: string;

  @IsNotEmpty()
  @IsMongoId()
  product_id: string;
}

export class OrderIdItemDto {
  @IsNotEmpty()
  @IsMongoId()
  order_id: string;
}

export class CreateSaleOrderDto {
  @IsNotEmpty()
  @IsString()
  shop_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderLineItemDto)
  order_lines: OrderLineItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderIdItemDto)
  order_id_list: OrderIdItemDto[];
}

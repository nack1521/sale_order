import { PartialType } from '@nestjs/mapped-types';
import { CreateSaleOrderDto } from './create-sale_order.dto';

export class UpdateSaleOrderDto extends PartialType(CreateSaleOrderDto) {}

import { PartialType } from '@nestjs/mapped-types';
import { CreateSaleReportDto } from './create-sale_report.dto';

export class UpdateSaleReportDto extends PartialType(CreateSaleReportDto) {}

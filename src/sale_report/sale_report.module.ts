import { Module } from '@nestjs/common';
import { SaleReportService } from './sale_report.service';
import { SaleReportController } from './sale_report.controller';

@Module({
  controllers: [SaleReportController],
  providers: [SaleReportService],
})
export class SaleReportModule {}

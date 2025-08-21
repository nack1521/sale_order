import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { SaleReportService } from './sale_report.service';
import { GenerateDailyReportDto } from './dto/generate_report.dto';

@Controller('sale-report')
export class SaleReportController {
  constructor(private readonly saleReportService: SaleReportService) {}

  @Post('generate-daily-report')
  @HttpCode(HttpStatus.OK)
  async generateDailyReport(@Body() body: GenerateDailyReportDto) {
    const day = new Date(`${body.date}T00:00:00`);
    return this.saleReportService.generateDailyFromRedis(day);
  }
}

import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { SaleReportService } from './sale_report.service';
import { CreateSaleReportDto } from './dto/create-sale_report.dto';
import { UpdateSaleReportDto } from './dto/update-sale_report.dto';

@Controller('sale-report')
export class SaleReportController {
  constructor(private readonly saleReportService: SaleReportService) {}

  @Post()
  create(@Body() createSaleReportDto: CreateSaleReportDto) {
    return this.saleReportService.create(createSaleReportDto);
  }

  @Get()
  findAll() {
    return this.saleReportService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.saleReportService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSaleReportDto: UpdateSaleReportDto) {
    return this.saleReportService.update(+id, updateSaleReportDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.saleReportService.remove(+id);
  }
}

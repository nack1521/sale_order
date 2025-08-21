import { Injectable } from '@nestjs/common';
import { CreateSaleReportDto } from './dto/create-sale_report.dto';
import { UpdateSaleReportDto } from './dto/update-sale_report.dto';

@Injectable()
export class SaleReportService {
  create(createSaleReportDto: CreateSaleReportDto) {
    return 'This action adds a new saleReport';
  }

  findAll() {
    return `This action returns all saleReport`;
  }

  findOne(id: number) {
    return `This action returns a #${id} saleReport`;
  }

  update(id: number, updateSaleReportDto: UpdateSaleReportDto) {
    return `This action updates a #${id} saleReport`;
  }

  remove(id: number) {
    return `This action removes a #${id} saleReport`;
  }
}

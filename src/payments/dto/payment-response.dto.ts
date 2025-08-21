export class PaymentResponseDto {
  _id: string;
  amount: number;
  product_list: string[];
  shop_id: string;
  createdAt: Date;
  updatedAt: Date;
}

import { order_status_enum } from '@prisma/client';
import { UUID } from '../../../@types/common.js';

export interface SaleResponseDto {
  orderId: UUID;
  targetId: UUID;
  status: order_status_enum;
  price: number;
  deliveryFee: number;
  userName: string;
  createdAt: Date;
  title: string;
  thumbnail: string;
}

export interface SaleDetailResponseDto extends SaleResponseDto {
  phone: string;
  delivery_address: {
    postal_code: string | null;
    address: string | null;
    address_detail: string | null;
    recipient_name: string | null;
    phone: string | null;
    address_name: string | null;
  };
  billNumber: string;
  option: string;
}

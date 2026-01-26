import { order_status_enum } from '@prisma/client';
import { UUID } from '../../../types/common.js';

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

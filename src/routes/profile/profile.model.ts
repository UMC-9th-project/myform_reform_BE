import { Prisma } from '@prisma/client';
import { UUID } from '../../types/common.js';
import { SaleResponseDto } from './dto/profile.res.dto.js';

// Repository에서 반환하는 raw 데이터 타입
// export interface RawSaleData {
//   order_id: string;
//   target_id: string | null;
//   status: order_status_enum;
//   price: number;
//   delivery_fee: number;
//   user: {
//     name: string;
//   };
//   reciept: {
//     created_at: Date;
//   } | null;
//   title: string | null;
//   photo: string | null;
// }

export type RawSaleData = Prisma.orderGetPayload<{
  select: {
    order_id: true;
    target_id: true;
    status: true;
    price: true;
    delivery_fee: true;
    target_type: true;
    user: {
      select: {
        name: true;
      };
    };
    reciept: {
      select: {
        created_at: true;
      };
    };
    quote_photo: {
      select: {
        content: true;
      };
      orderBy: {
        photo_order: 'asc';
      };
      take: 1;
    };
  };
}>;

export class Sale {
  private props: SaleResponseDto;

  private constructor(props: SaleResponseDto) {
    this.props = props;
  }

  static create(raw: RawSaleData, title: string, thumbnail: string): Sale {
    return new Sale({
      orderId: raw.order_id as UUID,
      targetId: raw.target_id as UUID,
      status: raw.status!,
      price: raw.price!.toNumber(),
      deliveryFee: raw.delivery_fee!.toNumber(),
      userName: raw.user.name ?? '',
      createdAt: raw.reciept.created_at ?? new Date(),
      title: title ?? '',
      thumbnail: thumbnail ?? ''
    });
  }

  toResponse(): SaleResponseDto {
    return { ...this.props };
  }

  // 나중에 비즈니스 메서드 추가 가능
  // canCancel(): boolean { ... }
  // calculateTotalPrice(): number { ... }
}

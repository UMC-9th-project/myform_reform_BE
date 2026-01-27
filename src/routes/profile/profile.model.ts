import { Prisma } from '@prisma/client';
import { UUID } from '../../types/common.js';
import {
  SaleDetailResponseDto,
  SaleResponseDto
} from './dto/profile.res.dto.js';

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
    receipt: {
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

export type RawSaleDetailData = Prisma.orderGetPayload<{
  select: {
    order_id: true;
    target_id: true;
    status: true;
    price: true;
    delivery_fee: true;
    target_type: true;
    user_address: true;
    user: {
      select: {
        name: true;
        phone: true;
      };
    };
    receipt: {
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

export type RawOption = Prisma.order_optionGetPayload<{
  select: {
    option_item: {
      select: {
        name: true;
        extra_price: true;
      };
    };
  };
}>;

export class Sale {
  private props: SaleResponseDto;

  private constructor(props: SaleResponseDto) {
    this.props = props;
  }

  static create(raw: RawSaleData, title: string): Sale {
    return new Sale({
      orderId: raw.order_id as UUID,
      targetId: raw.target_id as UUID,
      status: raw.status!,
      price: raw.price!.toNumber(),
      deliveryFee: raw.delivery_fee!.toNumber(),
      userName: raw.user.name ?? '',
      createdAt: raw.receipt.created_at ?? new Date(),
      title: title ?? '',
      thumbnail: raw.quote_photo[0]?.content ?? ''
    });
  }

  toResponse(): SaleResponseDto {
    return { ...this.props };
  }

  // 나중에 비즈니스 메서드 추가 가능
  // canCancel(): boolean { ... }
  // calculateTotalPrice(): number { ... }
}

export class SaleDetail {
  private props: SaleDetailResponseDto;

  private constructor(props: SaleDetailResponseDto) {
    this.props = props;
  }

  static create(
    raw: RawSaleDetailData,
    option: RawOption | null,
    title: string
  ) {
    return new SaleDetail({
      orderId: raw.order_id as UUID,
      targetId: raw.target_id as UUID,
      status: raw.status!,
      price: raw.price!.toNumber(),
      deliveryFee: raw.delivery_fee!.toNumber(),
      userName: raw.user.name ?? '',
      createdAt: raw.receipt.created_at ?? new Date(),
      title: title,
      thumbnail: raw.quote_photo[0]?.content ?? '',
      phone: raw.user.phone ?? '',
      address: raw.user_address ?? '',
      //FIXME: option, 운송장번호 어떻게 구현할지 논의 해야함
      option: option?.option_item?.name ?? '',
      billNumber: ''
    });
  }
  toResponse(): SaleDetailResponseDto {
    return { ...this.props };
  }
}

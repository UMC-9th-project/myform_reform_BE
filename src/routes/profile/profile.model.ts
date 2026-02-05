import { Prisma, order_status_enum } from '@prisma/client';
import { UUID } from '../../@types/common.js';
import {
  SaleDetailResponseDto,
  SaleResponseDto
} from './dto/profile.res.dto.js';
import {
  AddItemRequestDto,
  AddReformRequestDto
} from './dto/profile.req.dto.js';
import { Category, OptionGroup } from '../../@types/item.js';

const ORDER_STATUS_LABELS: Record<order_status_enum, string> = {
  PENDING: '결제 대기',
  PAID: '결제 완료',
  SENT: '발송 완료',
  WORKING: '작업 중',
  DELIVERY: '배송 중',
  COMPLETE: '거래 완료',
  SETTLEMENT: '정산 완료',
  CANCELLED: '취소됨',
  REFUNDED: '환불됨'
};

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
    user: {
      select: {
        name: true;
        phone: true;
      };
    };
    receipt: {
      select: {
        created_at: true;
        delivery_postal_code: true;
        delivery_address: true;
        delivery_address_detail: true;
        delivery_recipient_name: true;
        delivery_phone: true;
        delivery_address_name: true;
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

export type ItemDto = {
  ownerId: string;
  images: { content: string; photo_order: number }[];
  title: string;
  content: string;
  price: number;
  delivery: number;
  option: OptionGroup[];
  category: Category;
};

export type ReformDto = {
  ownerId: string;
  images: { content: string; photo_order: number }[];
  title: string;
  content: string;
  price: number;
  delivery: number;
  expectedWorking: number;
  category: Category;
};
export class Sale {
  private props: SaleResponseDto;

  private constructor(props: SaleResponseDto) {
    this.props = props;
  }

  static create(raw: RawSaleData, title: string): Sale {
    return new Sale({
      orderId: raw.order_id as UUID,
      targetId: raw.target_id as UUID,
      status: ORDER_STATUS_LABELS[raw.status!],
      price: raw.price!.toNumber() ?? 0,
      deliveryFee: raw.delivery_fee!.toNumber() ?? 0,
      userName: raw.user.name ?? '',
      createdAt: raw.receipt!.created_at ?? new Date(),
      title: title ?? '',
      thumbnail: raw.quote_photo[0]?.content ?? ''
    });
  }

  toResponse(): SaleResponseDto {
    return { ...this.props };
  }
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
    const receipt = raw.receipt!;
    return new SaleDetail({
      orderId: raw.order_id as UUID,
      targetId: raw.target_id as UUID,
      status: ORDER_STATUS_LABELS[raw.status!],
      price: raw.price?.toNumber() ?? 0,
      deliveryFee: raw.delivery_fee?.toNumber() ?? 0,
      userName: raw.user.name ?? '',
      createdAt: raw.receipt!.created_at ?? new Date(),
      title: title,
      thumbnail: raw.quote_photo[0]?.content ?? '',
      phone: raw.user.phone ?? '',
      delivery_address: {
        postal_code: receipt.delivery_postal_code ?? null,
        address: receipt.delivery_address ?? null,
        address_detail: receipt.delivery_address_detail ?? null,
        recipient_name: receipt.delivery_recipient_name ?? null,
        phone: receipt.delivery_phone ?? null,
        address_name: receipt.delivery_address_name ?? null
      },
      option: option?.option_item?.name ?? '',
      billNumber: ''
    });
  }
  toResponse(): SaleDetailResponseDto {
    return { ...this.props };
  }
}

export class Item {
  private props: ItemDto;

  private constructor(props: ItemDto) {
    this.props = props;
  }

  static create(raw: AddItemRequestDto, ownerId: string): Item {
    return new Item({
      ownerId,
      images: raw.imageUrls.map((url, i) => ({
        content: url,
        photo_order: i + 1
      })),
      title: raw.title,
      content: raw.content,
      price: raw.price,
      delivery: raw.delivery,
      option: raw.option,
      category: raw.category
    });
  }

  toDto(): ItemDto {
    return { ...this.props };
  }
}

export class Reform {
  private props: ReformDto;

  private constructor(props: ReformDto) {
    this.props = props;
  }

  static create(raw: AddReformRequestDto, ownerId: string): Reform {
    return new Reform({
      ownerId,
      images: raw.imageUrls.map((url, i) => ({
        content: url,
        photo_order: i + 1
      })),
      title: raw.title ?? '',
      content: raw.content ?? '',
      price: raw.price ?? 0,
      delivery: raw.delivery ?? 0,
      expectedWorking: raw.expected_working ?? 0,
      category: raw.category
    });
  }

  toDto(): ReformDto {
    return { ...this.props };
  }
}

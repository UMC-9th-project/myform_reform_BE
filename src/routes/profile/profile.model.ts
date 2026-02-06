import { Prisma, order_status_enum } from '@prisma/client';
import { UUID } from '../../@types/common.js';
import {
  SaleDetailResponseDto,
  SaleResponseDto,
  OrderResponseDto,
  OrderDetailResponseDto
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
    const receipt = raw.receipt;
    return new SaleDetail({
      orderId: raw.order_id as UUID,
      targetId: raw.target_id as UUID,
      status: ORDER_STATUS_LABELS[raw.status!],
      price: raw.price!.toNumber(),
      deliveryFee: raw.delivery_fee!.toNumber(),
      userName: raw.user.name ?? '',
      createdAt: raw.receipt.created_at ?? new Date(),
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
      //FIXME: option, 운송장번호 어떻게 구현할지 논의 해야함
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
      title: raw.title,
      content: raw.content,
      price: raw.price,
      delivery: raw.delivery,
      expectedWorking: raw.expected_working,
      category: raw.category
    });
  }

  toDto(): ReformDto {
    return { ...this.props };
  }
}

export type RawOrderData = Prisma.orderGetPayload<{
  select: {
    order_id: true;
    target_id: true;
    status: true;
    price: true;
    delivery_fee: true;
    target_type: true;
    quantity: true;
    tracking_number: true;
    owner: {
      select: {
        nickname: true;
      };
    };
    receipt: {
      select: {
        created_at: true;
        receipt_number: true;
        delivery_address: true;
        delivery_address_detail: true;
        delivery_address_name: true;
        delivery_phone: true;
        delivery_postal_code: true;
        delivery_recipient_name: true;
      };
    };
    review: {
      select: {
        review_id: true;
      };
    };
  };
}>;

export class Order {
  private props: OrderResponseDto;

  private constructor(props: OrderResponseDto) {
    this.props = props;
  }

  static create(raw: RawOrderData, title: string, thumbnail: string): Order {
    const price = raw.price ? raw.price.toNumber() : 0;
    const delivery_fee = raw.delivery_fee ? raw.delivery_fee.toNumber() : 0;
    const totalPrice = (price + delivery_fee) ? (price + delivery_fee).toString() : '0' ;
    const isPending = raw.status === 'PENDING';
    const hasReview = raw.review.length > 0;
    const reviewAvailable = !isPending && !hasReview;
    return new Order({
      receiptNumber: raw.receipt.receipt_number!,
      title: title,
      thumbnail: thumbnail,
      orderId: raw.order_id as UUID,
      targetType: raw.target_type ?? 'ITEM',
      targetId: raw.target_id as UUID,
      status: raw.status!,
      price: price,
      deliveryFee: delivery_fee,
      totalPrice: totalPrice,
      quantity: raw.quantity ?? 1,
      ownerNickname: raw.owner.nickname ?? '',
      createdAt: raw.receipt.created_at ?? new Date(),
      reviewAvailable: reviewAvailable,
      reviewId: raw.review[0]?.review_id ?? null
    });
  }

  toResponse(): OrderResponseDto {
    return { ...this.props };
  }
}

export type RawOrderDetailData = Prisma.orderGetPayload<{
  select: {
    order_id: true;
    user_id: true;
    target_id: true;
    status: true;
    price: true;
    delivery_fee: true;
    target_type: true;
    tracking_number: true;
    receipt: {
      select: {
        created_at: true;
        receipt_number: true;
        delivery_address: true;
        delivery_address_detail: true;
        delivery_address_name: true;
        delivery_phone: true;
        delivery_postal_code: true;
        delivery_recipient_name: true;
      };
    };
  };
}>;

export type RawOptionItemsWithGroup = {
  option_group_id: string;
  name: string | null;
  option_item: RawOptionItem[]
}

export type RawOptionItem = {
  name: string | null;
  option_item_id: string;
  extra_price: number | null;
}



export class OrderDetail {
  private props: OrderDetailResponseDto;

  private constructor(props: OrderDetailResponseDto) {
    this.props = props;
  }

  static create(raw: RawOrderDetailData, title: string | undefined, thumbnail: string | undefined, options : RawOptionItemsWithGroup[]): OrderDetail {
    const price = raw.price ? raw.price.toNumber() : 0;
    const delivery_fee = raw.delivery_fee ? raw.delivery_fee.toNumber() : 0;
    const totalPrice = (price + delivery_fee) ? (price + delivery_fee).toString() : '0' ;
    return new OrderDetail({
      title: title ?? '',
      thumbnail: thumbnail ?? '',
      orderId: raw.order_id,
      targetType: raw.target_type!,
      targetId: raw.target_id!,
      status: raw.status ?? 'PENDING',
      price: price,
      deliveryFee: delivery_fee,
      totalPrice: totalPrice,
      trackingNumber: raw.tracking_number ?? '',
      createdAt: raw.receipt.created_at ?? new Date(),
      receiptNumber: raw.receipt.receipt_number ?? '',
      deliveryPostalCode: raw.receipt.delivery_postal_code ?? '',
      deliveryAddress: raw.receipt.delivery_address ?? '',
      deliveryAddressDetail: raw.receipt.delivery_address_detail ?? '',
      deliveryRecipientName: raw.receipt.delivery_recipient_name ?? '',
      deliveryPhone: raw.receipt.delivery_phone ?? '',
      deliveryAddressName: raw.receipt.delivery_address_name ?? '',
      options : options
    });
  }

  toResponse(): OrderDetailResponseDto {
    return { ...this.props };
  }  
}

export type RawRequestData = Prisma.reform_requestGetPayload<{
  select: {
    reform_request_id: true;
    user_id: true;
    title: true;
    min_budget: true;
    max_budget: true;
    due_date: true;
    created_at: true;
    reform_request_photo: {
      select: {
        reform_request_photo_id: true;
        content: true;
      };
      take: 1;
    };
  };
}>;

export type RequestData = {
  reformRequestId:UUID;
  userId: UUID;
  title: string;
  minBudget: number | null;
  maxBudget: number | null;
  dueDate: Date | null;
  createdAt: Date | null;
  reformRequestPhotoId: UUID;
  thumbnail: string | null;
}

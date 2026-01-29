import { Prisma } from '@prisma/client';
import { UUID } from '../../types/common.js';
import {
  SaleDetailResponseDto,
  SaleResponseDto
} from './dto/profile.res.dto.js';
import {
  AddItemRequestDto,
  AddReformRequestDto
} from './dto/profile.req.dto.js';
import { Category, OptionGroup } from '../../types/item.js';

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

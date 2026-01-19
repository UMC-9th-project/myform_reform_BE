import { IsUUID, IsArray, ArrayMinSize, IsInt, Min, IsOptional, IsString, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class NewAddressDto {
  @IsOptional()
  @IsString()
  postal_code?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  address_detail?: string;
}

export class GetOrderSheetRequestDto {
  @IsUUID()
  item_id!: string;

  @IsArray()
  @ArrayMinSize(0)
  @IsUUID(undefined, { each: true })
  option_item_ids!: string[];

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsUUID()
  delivery_address_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewAddressDto)
  new_address?: NewAddressDto;
}

export interface GetOrderSheetResponseDto {
  order_number: string;
  order_item: {
    reformer_nickname: string;
    thumbnail: string;
    title: string;
    selected_options: string[];
    quantity: number;
    price: number;
  };
  delivery_address: {
    delivery_address_id?: string;
    postal_code: string | null;
    address: string | null;
    address_detail: string | null;
  } | null;
  payment: {
    product_amount: number;
    delivery_fee: number;
    total_amount: number;
  };
}

export class CreateOrderRequestDto {
  @IsUUID()
  item_id!: string;

  @IsArray()
  @ArrayMinSize(0)
  @IsUUID(undefined, { each: true })
  option_item_ids!: string[];

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsUUID()
  delivery_address_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewAddressDto)
  new_address?: NewAddressDto;

  @IsString()
  @IsNotEmpty()
  imp_uid!: string;

  @IsString()
  @IsNotEmpty()
  merchant_uid!: string;
}

export interface CreateOrderResponseDto {
  order_id: string;
  payment_status: string;
  payment_method: string | null;
  payment_gateway: string | null;
}

export interface GetOrderResponseDto {
  order_id: string;
  order_number: string;
  status: string | null;
  delivery_address: {
    postal_code: string | null;
    address: string | null;
    address_detail: string | null;
  };
  order_items: Array<{
    thumbnail: string;
    title: string;
    selected_options: string[];
    reformer_nickname: string;
  }>;
  payment: {
    amount: number;
    payment_method: string | null;
    card_name: string | null;
    masked_card_number: string | null;
    card_info: string | null;
    approved_at: Date | null;
  };
  first_item: {
    thumbnail: string;
    title: string;
    selected_options: string[];
    reformer_nickname: string;
  } | null;
  remaining_items_count: number;
  total_amount: number;
  delivery_fee: number;
}

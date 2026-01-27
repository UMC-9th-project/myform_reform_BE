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
  merchant_uid!: string;
}

export class VerifyPaymentRequestDto {
  @IsUUID()
  order_id!: string;

  @IsString()
  @IsNotEmpty()
  imp_uid!: string;
}

export class GetOrderSheetFromCartRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  cart_ids!: string[];

  @IsOptional()
  @IsUUID()
  delivery_address_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewAddressDto)
  new_address?: NewAddressDto;
}

export class CreateOrderFromCartRequestDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  cart_ids!: string[];

  @IsOptional()
  @IsUUID()
  delivery_address_id?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NewAddressDto)
  new_address?: NewAddressDto;

  @IsString()
  @IsNotEmpty()
  merchant_uid!: string;
}

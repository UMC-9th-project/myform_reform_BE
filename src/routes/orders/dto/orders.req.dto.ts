import { IsUUID, IsArray, ArrayMinSize, IsInt, Min, IsOptional, IsString, ValidateNested, IsNotEmpty, Max, ArrayMaxSize, IsUrl } from 'class-validator';
import { Type } from 'class-transformer';

export class NewAddressDto {
  @IsString()
  @IsNotEmpty()
  postal_code!: string;

  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @IsString()
  address_detail?: string;

  @IsString()
  @IsNotEmpty()
  recipient_name!: string;

  @IsString()
  @IsNotEmpty()
  phone!: string;

  @IsOptional()
  @IsString()
  address_name?: string;
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

export class CreateReviewRequestDto {
  /**
   * @summary 리뷰 별점
   * @isInt
   * @minimum 1
   * @maximum 5
   * @example 5
   */
  star!: number;

  /**
   * @summary 리뷰 내용
   * @example "좋은 상품입니다."
   */
  content?: string;

  /**
   * @summary 리뷰 사진
   * @minItems 0
   * @maxItems 4
   */
  photos?: string[];
}
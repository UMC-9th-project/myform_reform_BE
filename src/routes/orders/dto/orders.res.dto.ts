export interface OrderSheetItemDto {
  reformer_nickname: string;
  thumbnail: string;
  title: string;
  selected_options: string[];
  quantity: number;
  price: number;
}

export interface SellerGroupDto {
  owner_id: string;
  reformer_nickname: string;
  items: OrderSheetItemDto[];
  delivery_fee: number;
}
import { RawReviewData } from '../orders.model.js';

export interface GetOrderSheetResponseDto {
  receipt_number: string;
  delivery_fee: number;
  delivery_address: {
    delivery_address_id?: string;
    postal_code: string | null;
    address: string | null;
    address_detail: string | null;
    recipient_name: string | null;
    phone: string | null;
    address_name: string | null;
  } | null;
  payment: {
    product_amount: number;
    delivery_fee: number;
    total_amount: number;
  };
  seller_groups: SellerGroupDto[];
}

export interface CreateOrderResponseDto {
  order_id: string;
  payment_required: boolean;
  payment_info?: {
    merchant_uid: string;
    amount: number;
  };
}

export interface VerifyPaymentResponseDto {
  success: boolean;
}

export interface GetOrderItemDto {
  thumbnail: string;
  title: string;
  selected_options: string[];
  reformer_nickname: string;
  quantity: number;
  price: number;
}

export interface GetOrderResponseDto {
  order_id: string;
  receipt_number: string;
  status: string | null;
  delivery_address: {
    postal_code: string | null;
    address: string | null;
    address_detail: string | null;
    recipient_name: string | null;
    phone: string | null;
    address_name: string | null;
  };
  order_items: GetOrderItemDto[];
  payment: {
    amount: number;
    payment_method: string | null;
    card_name: string | null;
    masked_card_number: string | null;
    card_info: string | null;
    approved_at: Date | null;
  };
  first_item: GetOrderItemDto | null;
  remaining_items_count: number;
  total_amount: number;
  product_amount: number;
  delivery_fee: number;
}

export class CreateReviewResponseDto {
  review_id: string;
  user_id: string;
  order_id: string;
  star: number;
  content: string;
  created_at: Date;
  review_photo: string[];

  constructor(review: RawReviewData) {
    this.review_id = review.review_id;
    this.user_id = review.user_id ?? '';
    this.order_id = review.order_id;
    this.star = review.star ?? 0;
    this.content = review.content ?? '';
    this.review_photo = review.review_photo.map((photo) => photo.content ?? '');
    this.created_at = review.created_at ?? new Date();
  }
}

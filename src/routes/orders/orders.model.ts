import { CreateReviewRequestDto } from "./dto/orders.req.dto.js";
import { Prisma } from "@prisma/client";
export interface OrderItemInfo {
  reformer_nickname: string;
  thumbnail: string;
  title: string;
  selected_options: string[];
  quantity: number;
  price: number;
}

export interface DeliveryAddressInfo {
  delivery_address_id?: string;
  postal_code: string | null;
  address: string | null;
  address_detail: string | null;
  recipient_name: string | null;
  phone: string | null;
  address_name: string | null;
}

export interface PaymentSummary {
  product_amount: number;
  delivery_fee: number;
  total_amount: number;
}

export interface OrderSheetSellerGroup {
  owner_id: string;
  reformer_nickname: string;
  items: OrderItemInfo[];
  delivery_fee: number;
}

export interface OrderSheetResponse {
  receipt_number: string;
  delivery_fee: number;
  delivery_address: DeliveryAddressInfo | null;
  payment: PaymentSummary;
  seller_groups: OrderSheetSellerGroup[];
}

export interface OrderSheetLineItem {
  option_item_ids: string[];
  quantity: number;
}

export interface CreateOrderRequest {
  item_id: string;
  option_item_ids?: string[];
  quantity?: number;
  items?: OrderSheetLineItem[];
  delivery_address_id?: string;
  new_address?: {
    postal_code?: string;
    address?: string;
    address_detail?: string;
    recipient_name?: string;
    phone?: string;
    address_name?: string;
  };
}

export interface CreateOrderResponse {
  order_id: string;
  payment_required: boolean;
  payment_info?: {
    imp_uid?: string;
    merchant_uid: string;
    amount: number;
  };
}

export interface OrderItemSummary {
  thumbnail: string;
  title: string;
  selected_options: string[];
  reformer_nickname: string;
  quantity: number;
  price: number;
}

export interface PaymentInfo {
  amount: number;
  payment_method: string | null;
  card_name: string | null;
  masked_card_number: string | null;
  card_info: string | null;
  approved_at: Date | null;
}

export interface OrderResponse {
  order_id: string;
  receipt_number: string;
  status: string | null;
  delivery_address: DeliveryAddressInfo;
  first_item: OrderItemSummary | null;
  remaining_items_count: number;
  order_items: OrderItemSummary[];
  payment: PaymentInfo;
  total_amount: number;
  product_amount: number;
  delivery_fee: number;
}

export class CreateReviewInput {
  orderId: string;
  userId: string;
  ownerId: string;
  star: number;
  content: string;
  photos: string[];

  constructor(orderId: string, userId: string, ownerId: string, requestBody: CreateReviewRequestDto) {
    this.orderId = orderId;
    this.userId = userId;
    this.ownerId = ownerId;
    this.star = requestBody.star;
    this.content = requestBody.content ?? '';
    this.photos = requestBody.photos ?? [];
  }
}

export type RawReviewData = Prisma.reviewGetPayload<{
  include: {
    review_photo: true;
  };
}>;

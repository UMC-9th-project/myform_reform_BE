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
}

export interface PaymentSummary {
  product_amount: number;
  delivery_fee: number;
  total_amount: number;
}

export interface OrderSheetResponse {
  order_number: string;
  order_item: OrderItemInfo;
  delivery_address: DeliveryAddressInfo | null;
  payment: PaymentSummary;
}

export interface CreateOrderRequest {
  item_id: string;
  option_item_ids: string[];
  quantity: number;
  delivery_address_id?: string;
  new_address?: {
    postal_code?: string;
    address?: string;
    address_detail?: string;
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
  order_number: string;
  status: string | null;
  delivery_address: DeliveryAddressInfo;
  first_item: OrderItemSummary | null;
  remaining_items_count: number;
  order_items: OrderItemSummary[];
  payment: PaymentInfo;
  total_amount: number;
  delivery_fee: number;
}

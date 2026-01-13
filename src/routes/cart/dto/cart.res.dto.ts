export interface OptionResponse {
  option_item_id: string | null;
  name: string | null;
  extra_price: number;
}

export interface CartItemResponse {
  cartId: string;
  itemId: string | null;
  title: string | null;
  // imageUrl
  price: number;
  quantity: number;
  delivery: number;
  options: OptionResponse[];
}

export interface SellerCartResponse {
  ownerId: string;
  ownerName: string | null;
  deliveryFee: number;
  total: number;
  items: CartItemResponse[];
}

export type CartGroupedResponse = SellerCartResponse[];

export default CartGroupedResponse;

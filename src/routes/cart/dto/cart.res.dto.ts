/**
 * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
 */

import { UUID } from '../../../types/common.js';

export interface CreateCartResDTO {
  /**
   * @format uuid
   */
  cartId: UUID;
  createdAt: Date;
}

export interface OptionDTO {
  /**
   * @format uuid
   */
  option_item_id: UUID | null;
  name: string | null;
  extra_price: number;
}

export interface CartItemDTO {
  /**
   * @format uuid
   */
  cartId: UUID;
  /**
   * @format uuid
   */
  itemId: UUID | null;
  title: string | null;
  imageUrl: string | null;
  price: number;
  quantity: number;
  delivery: number;
  options: OptionDTO[];
}

export interface SellerCartDTO {
  /**
   * @format uuid
   */
  ownerId: UUID;
  ownerName: string | null;
  deliveryFee: number;
  total: number;
  items: CartItemDTO[];
}

export type CartGroupedResDTO = SellerCartDTO[];

export default CartGroupedResDTO;

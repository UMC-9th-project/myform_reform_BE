/**
 * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
 */

import { UUID } from '../../@types/common.js';

export interface WishResDTO {
  /**
   * @format uuid
   */
  wishId: UUID;
  createdAt: Date;
}

export interface DeleteWishResDTO {
  /**
   * @format uuid
   */
  wishId: UUID;
  deletedAt: Date;
}

export type WishType = 'PROPOSAL' | 'ITEM' | 'REQUEST';

export interface WishReqDTO {
  /**
   * 위시 타입
   * @example PROPOSAL
   */
  type: WishType;
  /**
   * @format uuid
   */
  itemId: UUID;
}

export interface WishDetailDTO {
  wishType: WishType;
  itemId: UUID;
  content: string;
  title: string;
  avgStar?: number | null;
  reviewCount?: number | null;
  price: number;
  name: string; // sellerName or userName
}

export interface WishListResDTO {
  list: WishDetailDTO[];
}

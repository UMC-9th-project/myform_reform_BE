/**
 * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
 */
export type UUID = string;

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

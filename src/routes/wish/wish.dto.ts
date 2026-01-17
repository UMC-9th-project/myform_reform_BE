/**
 * @pattern ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$
 */
export type UUID = string;

export interface CreateWishResDTO {
  /**
   * @format uuid
   */
  wishId: UUID;
  createdAt: Date;
}

export type WishType = 'PROPOSAL' | 'ITEM' | 'REQUEST';

export interface CreateWishReqDTO {
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

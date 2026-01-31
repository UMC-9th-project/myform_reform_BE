import { UUID } from '../../../@types/common.js';

export type WishType = 'PROPOSAL' | 'ITEM' | 'REQUEST';

export interface WishReqDTO {
  /**
   * 위시 타입
   * @example PROPOSAL
   */
  type: WishType;

  itemId: UUID;
}

import { UUID } from '../../../@types/common.js';

export type WishType = 'PROPOSAL' | 'ITEM' | 'REQUEST';

export interface WishReqDTO {
  type: WishType;
  itemId: UUID;
}

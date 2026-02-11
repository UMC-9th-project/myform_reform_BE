import { UUID } from '../../../@types/common.js';

export type WishType = 'PROPOSAL' | 'ITEM' | 'REQUEST';

export class WishReqDTO {
  type!: WishType;
  itemId!: UUID;
}

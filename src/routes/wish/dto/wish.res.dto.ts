import { UUID } from '../../../@types/common.js';
import { WishType } from './wish.req.dto.js';

export interface WishResDTO {
  wishId: UUID;
  createdAt: Date;
}

export interface DeleteWishResDTO {
  wishId: UUID;
  deletedAt: Date;
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

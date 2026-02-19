import { UUID } from '../../../@types/common.js';
import { WishType } from './wish.req.dto.js';

export class WishResDTO {
  wishId!: UUID;
  createdAt!: Date;
}

export class DeleteWishResDTO {
  wishId!: UUID;
  deletedAt!: Date;
}

export class WishDetailDTO {
  wishType!: WishType;
  itemId!: UUID;
  content!: string;
  title!: string;
  avgStar?: number | null;
  reviewCount?: number | null;
  price!: number;
  name!: string; // sellerName or userName
}

export class WishListResDTO {
  list!: WishDetailDTO[];
}

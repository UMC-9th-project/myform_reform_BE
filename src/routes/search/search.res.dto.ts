import { UUID } from '../../@types/common.js';

export interface SearchResDTO {
  id: UUID;
  type: 'ITEM' | 'PROPOSAL' | 'REQUEST';
  title: string;
  content: string;
  price?: number;
  minPrice?: number;
  maxPrice?: number;
  avgStar: number;
  reviewCount: number;
  imageUrl: string | null;
  authorName: string;
  createdAt: string;
  isLiked: boolean; // DB와 대조하여 채워줄 필드
}

export interface SearchListResDTO {
  results: SearchResDTO[];
  nextCursor: string | null;
  hasNextPage: boolean;
  totalCount: number;
}

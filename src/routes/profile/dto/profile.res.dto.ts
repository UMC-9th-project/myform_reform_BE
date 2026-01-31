import { order_status_enum } from '@prisma/client';
import { UUID } from '../../../@types/common.js';

export interface SaleResponseDto {
  orderId: UUID;
  targetId: UUID;
  status: order_status_enum;
  price: number;
  deliveryFee: number;
  userName: string;
  createdAt: Date;
  title: string;
  thumbnail: string;
}

export interface SaleDetailResponseDto extends SaleResponseDto {
  phone: string;
  address: string;
  billNumber: string;
  option: string;
}

// --- 5 GET 응답 타입 (profile/{id}, feed, item, proposal, review) ---

export interface ProfileInfoResponse {
  profilePhoto: string | null;
  nickname: string | null;
  avgStar: number | null;
  reviewCount: number | null;
  totalSaleCount: number;
  keywords: string[];
  bio: string | null;
}

export interface FeedItem {
  feedId: string;
  images: string[];
  isPinned: boolean;
}

export interface FeedListResponse {
  feeds: FeedItem[];
  nextCursor: string | null;
  hasNext: boolean;
}

export interface MarketItem {
  itemId: string;
  photo: string | null;
  isWished: boolean;
  title: string | null;
  price: number | null;
  avgStar: number | null;
  reviewCount: number | null;
  sellerName: string | null;
}

export interface MarketListResponse {
  items: MarketItem[];
  nextCursor: string | null;
  hasNext: boolean;
}

export interface ProposalItem {
  proposalId: string;
  photo: string | null;
  isWished: boolean;
  title: string | null;
  price: number | null;
  avgStar: number | null;
  reviewCount: number | null;
  sellerName: string | null;
}

export interface ProposalListResponse {
  proposals: ProposalItem[];
  nextCursor: string | null;
  hasNext: boolean;
}

export interface ReviewItem {
  reviewId: string;
  userId: string | null;
  userName: string | null;
  userNickname: string | null;
  userProfilePhoto: string | null;
  star: number | null;
  createdAt: Date | null;
  content: string | null;
  productId: string | null;
  productType: 'ITEM' | 'PROPOSAL' | null;
  productTitle: string | null;
  productPhoto: string | null;
  productPrice: number | null;
  photos: string[];
}

export interface ReviewListResponse {
  reviews: ReviewItem[];
  nextCursor: string | null;
  hasNext: boolean;
}

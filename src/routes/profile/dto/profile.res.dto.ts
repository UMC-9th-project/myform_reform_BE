import { order_status_enum } from '@prisma/client';
import { UUID } from '../../../@types/common.js';
import { RawOptionItemsWithGroup } from '../profile.model.js'

/** 프로필 피드 등록 성공 응답 DTO */
export interface AddFeedResponseDto {
  feedId: UUID;
}

export interface SaleResponseDto {
  orderId: UUID;
  targetId: UUID;
  status: string;
  price: number;
  deliveryFee: number;
  userName: string;
  createdAt: Date;
  title: string;
  thumbnail: string;
}

export interface SaleDetailResponseDto extends SaleResponseDto {
  phone: string;
  delivery_address: {
    postal_code: string | null;
    address: string | null;
    address_detail: string | null;
    recipient_name: string | null;
    phone: string | null;
    address_name: string | null;
  };
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

export interface OrderResponseDto {
  receiptNumber: string;
  orderId: UUID;
  title: string;
  targetId: UUID;
  status: order_status_enum;
  price: number;
  deliveryFee: number;
  totalPrice: string;
  targetType: string;
  quantity: number;
  ownerNickname: string;
  createdAt: Date;
  thumbnail: string;
  reviewAvailable: boolean;
  reviewId: UUID | null;
  trackingNumber: string;
  deliveryAddress: string;
  deliveryAddressDetail: string;
  deliveryAddressName: string;
  deliveryPhone: string;
  deliveryPostalCode: string;
  deliveryRecipientName: string;
}

export interface OrderDetailResponseDto{
  title: string;
  thumbnail: string;
  receiptNumber: string;
  orderId: UUID;
  targetType: string;
  targetId: string;
  status: order_status_enum;
  price: number;
  deliveryFee: number;
  totalPrice: string;
  trackingNumber: string;
  createdAt: Date;
  deliveryPostalCode: string;
  deliveryAddress: string;
  deliveryAddressDetail: string;
  deliveryRecipientName: string;
  deliveryPhone: string;
  deliveryAddressName: string;
  options: RawOptionItemsWithGroup[]
}
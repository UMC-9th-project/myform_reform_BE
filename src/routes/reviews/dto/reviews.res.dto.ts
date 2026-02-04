export interface ReviewResponseDto {
  data: ReviewDto[];
  cursor: string | null;
  hasNext: boolean;
}

export interface ReviewDto {
  reviewId: string;
  userId: string;
  userName: string;
  userNickname: string;
  userProfilePhoto: string;
  star: number;
  createdAt: Date;
  content: string;
  orderId: string;
  totalAmount: number;
  deliveryFee: number;
  finalPrice: string;
  orderTitle: string;
  orderThumbnail: string;
  targetType: 'ITEM' | 'REQUEST' | 'PROPOSAL';
  targetId: string;
}
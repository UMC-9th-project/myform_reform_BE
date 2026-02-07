import { Prisma, target_type_enum } from '@prisma/client';

export type UserProfile = {
  nickname: string;
  profilePhoto: string;
}

interface ProductBaseInfo {
  title: string;
  thumbnail: string;
  price?: number;
}

export interface ItemInfo extends ProductBaseInfo { item_id: string; }
export interface RequestInfo extends ProductBaseInfo { request_id: string; }
export interface ProposalInfo extends ProductBaseInfo { proposal_id: string; }

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
  price: number;
  deliveryFee: number;
  finalPrice: string;
  orderTitle: string;
  orderThumbnail: string;
  targetType: target_type_enum;
  targetId: string;
  reviewPhotos: string[];
}

export interface ReviewResponseDto {
  cursor: string | null;
  hasNext: boolean;
  data: ReviewDto[];
}

export type RawReviewData = Prisma.reviewGetPayload<{
  select: {
    user_id: true;
    review_id: true;
    content: true;
    star: true;
    created_at: true;
    order: {
      select: {
        order_id: true;
        price: true;
        delivery_fee: true;
        target_type: true;
        target_id: true;
      }
    }
    review_photo: {
      select: {
        content: true;
      }
    }
  }
}>;

export type RawItemInfo = Prisma.itemGetPayload<{
  select: {
    item_id: true;
    title: true;
    item_photo: {
      select: {
        content: true;
      }
    }
  }
}>;

export type RawRequestInfo = Prisma.reform_requestGetPayload<{
  select: {
    reform_request_id: true;
    title: true;
    reform_request_photo: {
      select: {
        content: true;
      }
    }
  }
}>;


export type RawProposalInfo = Prisma.reform_proposalGetPayload<{
  select: {
    reform_proposal_id: true;
    title: true;
    reform_proposal_photo: {
      select: {
        content: true;
      }
    }
  }
}>;

export type RawUserInfo = Prisma.userGetPayload<{
  select: {
    user_id: true;
    name: true;
    nickname: true;
    profile_photo: true;
  }
}>;

export interface UnifiedProductInfo {
  product_id: string;
  title: string;
  thumbnail: string;
}

// 제안서 리뷰 목록 조회용 DTO
export interface ProposalReviewDto {
  reviewId: string;
  userId: string;
  userNickname: string;
  userProfilePhoto: string;
  star: number;
  createdAt: Date;
  content: string;
  reviewPhotos: string[];
}

export interface ProposalReviewListResponseDto {
  totalCount: number;
  avgStar: number;
  photoReviewCount: number;
  reviewPhotos: string[];
  reviews: ProposalReviewDto[];
  cursor: string | null;
  hasNext: boolean;
}

export type ProposalReviewSortBy = 'recent' | 'high_rating' | 'low_rating';

export type RawProposalReviewData = Prisma.reviewGetPayload<{
  select: {
    review_id: true;
    user_id: true;
    star: true;
    content: true;
    created_at: true;
    review_photo: {
      select: {
        content: true;
        photo_order: true;
      };
    };
  };
}>;

export interface ProposalReviewStats {
  totalCount: number;
  avgStar: number;
  photoReviewCount: number;
  reviewPhotos: string[];
}

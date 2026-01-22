import type { Prisma } from '@prisma/client';

/**
 * 사용자 세션 정보
 */
export interface UserSession {
  is_logged_in: boolean;
  role: 'USER' | 'OWNER' | null;
  user_id: string | null;
  nickname: string | null;
  profile_image: string | null;
  cart_count: number;
}

/**
 * 배너 정보
 */
export interface Banner {
  id: string;
  image_url: string;
}

/**
 * 인기 상품 정보
 */
export interface TrendingItem {
  item_id: string;
  thumbnail: string;
  title: string;
  price: number;
  star: number;
  review_count: number;
  owner_id: string;
  owner_nickname: string;
  is_wished: boolean;
}

/**
 * 커스텀 오더 정보
 */
export interface CustomOrder {
  proposal_id: string;
  thumbnail: string;
  title: string;
  min_price: number;
  owner_id: string;
  owner_nickname: string;
}

/**
 * 베스트 리폼러 정보
 */
export interface BestReformer {
  owner_id: string;
  nickname: string;
  profile_image: string;
  bio: string;
}

/**
 * 홈 데이터
 */
export interface HomeData {
  banners: Banner[];
  trending_items: TrendingItem[];
  custom_orders: CustomOrder[];
  best_reformers: BestReformer[];
}

/**
 * 홈 응답
 */
export interface HomeResponse {
  result: boolean;
  user_session: UserSession;
  home_data: HomeData;
}

/**
 * Prisma 타입 기반 Model Return Types
 */
export type UserSelect = Prisma.userGetPayload<{
  select: {
    user_id: true;
    nickname: true;
  };
}>;

export type OwnerSelect = Prisma.ownerGetPayload<{
  select: {
    owner_id: true;
    nickname: true;
    profile_photo: true;
  };
}>;

export type BannerSelect = Prisma.bannerGetPayload<{
  select: {
    banner_id: true;
    image_url: true;
  };
}>;

export type ItemWithRelations = Prisma.itemGetPayload<{
  include: {
    owner: {
      select: {
        owner_id: true;
        nickname: true;
      };
    };
    item_photo: {
      select: {
        content: true;
      };
    };
  };
}>;

export type ReformProposalWithRelations = Prisma.reform_proposalGetPayload<{
  include: {
    owner: {
      select: {
        owner_id: true;
        nickname: true;
      };
    };
    reform_proposal_photo: {
      select: {
        content: true;
      };
    };
  };
}>;

export type OwnerForBestReformers = Prisma.ownerGetPayload<{
  select: {
    owner_id: true;
    nickname: true;
    profile_photo: true;
    bio: true;
    avg_star: true;
    review_count: true;
  };
}>;

import {
  UserSession,
  Banner,
  TrendingItem,
  CustomOrder,
  BestReformer
} from '../home.model.js';

export class UserSessionDto implements UserSession {
  is_logged_in!: boolean;
  role!: 'USER' | 'OWNER' | null;
  user_id!: string | null;
  nickname!: string | null;
  profile_image!: string | null;
  cart_count!: number;
}

export class BannerDto implements Banner {
  id!: string;
  image_url!: string;
}

export class TrendingItemDto implements TrendingItem {
  item_id!: string;
  thumbnail!: string;
  title!: string;
  price!: number;
  star!: number;
  review_count!: number;
  owner_id!: string;
  owner_nickname!: string;
  is_wished!: boolean;
}

export class CustomOrderDto implements CustomOrder {
  proposal_id!: string;
  thumbnail!: string;
  title!: string;
  min_price!: number;
  star!: number;
  review_count!: number;
  is_wished!: boolean;
  owner_id!: string;
  owner_nickname!: string;
}

export class BestReformerDto implements BestReformer {
  owner_id!: string;
  nickname!: string;
  profile_image!: string;
  bio!: string;
  avg_star!: number | null;
  review_count!: number | null;
  trade_count!: number | null;
  keywords!: string[];
}

export class HomeDataDto {
  banners!: BannerDto[];
  trending_items!: TrendingItemDto[];
  custom_orders!: CustomOrderDto[];
  best_reformers!: BestReformerDto[];
}

export class HomeDataResponseDto {
  result!: boolean;
  user_session!: UserSessionDto;
  home_data!: HomeDataDto;
}

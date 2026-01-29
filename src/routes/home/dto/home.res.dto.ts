import {
  UserSession,
  Banner,
  TrendingItem,
  CustomOrder,
  BestReformer
} from '../home.model.js';

/**
 * Service Layer DTOs
 */
export interface UserSessionDto extends UserSession {}

export interface BannerDto extends Banner {}

export interface TrendingItemDto extends TrendingItem {}

export interface CustomOrderDto extends CustomOrder {}

export interface BestReformerDto extends BestReformer {}

/**
 * 홈 데이터 조회 결과 DTO
 */
export interface HomeDataDto {
  banners: BannerDto[];
  trending_items: TrendingItemDto[];
  custom_orders: CustomOrderDto[];
  best_reformers: BestReformerDto[];
}

/**
 * 홈 전체 조회 결과 DTO
 */
export interface HomeDataResponseDto {
  result: boolean;
  user_session: UserSessionDto;
  home_data: HomeDataDto;
}

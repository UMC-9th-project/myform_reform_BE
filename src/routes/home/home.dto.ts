import {
  HomeResponse,
  UserSession,
  Banner,
  TrendingItem,
  CustomOrder,
  BestReformer
} from './home.model.js';

/**
 * JWT 토큰에서 추출할 사용자 정보 (임시 - JWT 구현 시 사용)
 */
export interface AuthUser {
  userId?: string;
  role?: 'USER' | 'OWNER';
}

/**
 * 메인 페이지 요청 DTO (임시 - 헤더/쿼리 파라미터용)
 * TODO: JWT 인증 구현 후 이 부분은 JWT 미들웨어에서 추출
 */
export interface GetHomeRequestDto {
  userId?: string;
  role?: 'USER' | 'OWNER';
}

/**
 * 메인 페이지 응답 DTO
 */
export interface GetHomeResponseDto extends HomeResponse {}

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

import { UserCreateInput } from '../auth.model.js'

export type AuthStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type Role = 'user' | 'reformer';
export type RegistrationType = 'LOCAL' | 'KAKAO';

// 카카오 회원가입 응답 데이터
export interface KakaoSignupResponse {
  status: 'signup';
  user: {
    kakaoId: string;
    email: string;
    role: string;
    redirectUrl?: string;
  };
}

// 카카오 로그인 데이터
export interface KakaoLoginResponse {
  accessToken: string;
  refreshToken: string;
  status: 'login';
}

// 카카오 인증 응답 데이터
export type KakaoAuthResponse = KakaoSignupResponse | KakaoLoginResponse

// 로그아웃 응답 데이터
export interface LogoutResponse {
  statusCode: number;
  message: string;
}

// 카카오 로그인 후 응답 데이터
export interface PassportUserInfo {
  status: 'signup' | 'login';
  role: Role;
  kakaoId?: string;
  email?: string;
  id?: string;
  auth_status?: AuthStatus;
  redirectUrl?: string;
}

// 리폼러 db 생성 요청 데이터 (Service -> Model)
export interface OwnerCreateDto extends UserCreateInput {
  businessNumber?: string;
  description: string;
  portfolioPhotos: string[];
}

// 로그인 요청 데이터 (Controller -> Service)
export interface LocalLoginRequest {
  email: string;
  password: string;
  role: Role;
}

// 리프레시 토큰 갱신 요청 데이터 (Controller -> Service)
export interface RefreshTokenRequest {
  refreshToken: string;
}

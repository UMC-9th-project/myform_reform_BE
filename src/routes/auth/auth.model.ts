import { reformer_status_enum } from '@prisma/client';
import { Role, RegistrationType } from './dto/auth.dto.js';

export interface AuthLoginResponse {
  accessToken: string;
  refreshToken: string;
}

// 일반 회원가입 요청 데이터 (service -> repository)
export interface UserCreateInput {
  name: string;
  email: string;
  registration_type: RegistrationType;
  oauthId?: string;
  hashedPassword?: string;
  nickname: string;
  phoneNumber: string;
  role: Role;
  privacyPolicy: boolean;
}

// 리폼러 회원가입 요청 데이터 (service -> repository)
export interface OwnerCreateInput {
  name: string;
  email: string;
  registration_type: RegistrationType;
  oauthId?: string;
  hashedPassword?: string;
  nickname: string;
  phoneNumber: string;
  role: Role;
  privacyPolicy: boolean;
  businessNumber?: string;
  description: string;
  portfolioPhotos: string[];
}

// 일반 회원가입 db 생성 후 응답 데이터 (Repository -> Service)
export interface UserCreateResponse {
  id: string;
  email: string;
  nickname: string;
  role: Role;
}

// 리폼러 회원가입 db 생성 후 응답 데이터 (Repository -> Service)
export interface OwnerCreateResponse {
  id: string;
  email: string;
  nickname: string;
  role: Role;
  auth_status: reformer_status_enum
}

// 리프레시 토큰 갱신 요청 데이터 (Controller -> Service)
export interface RefreshTokenRequest {
  refreshToken: string;
}

// 카카오 로그인 후 응답 데이터
export interface PassportUserInfo {
  status: 'signup' | 'login';
  role: Role;
  kakaoId?: string;
  email?: string;
  id?: string;
  auth_status?: reformer_status_enum;
  redirectUrl?: string;
}

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
  status: 'login';
  accessToken: string;
  refreshToken: string;
}

// 카카오 인증 응답 데이터
export type KakaoAuthResponse = KakaoSignupResponse | KakaoLoginResponse

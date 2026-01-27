import { AuthStatus, Role } from '../auth/auth.dto.js';

// 닉네임 중복 검사 응답 데이터
export interface CheckNicknameResponse {
  isAvailable: boolean;
  nickname: string;
  message: string;
}

// 유저 정보 응답 데이터
export interface UsersInfoResponse {
  id: string;
  email: string;
  nickname: string;
  hashed?: string;
  role: Role;
  auth_status?: AuthStatus;
}

// 유저 프로필 업데이트 응답 데이터 (Service -> Controller)
export interface UpdateUserProfileResponse {
  userId: string;
  nickname: string;
  phoneNumber: string;
  email: string;
}

// 유저 프로필 업데이트 응답 데이터 (Repository -> Service)
export interface UpdateUserProfileResult {
  userId: string;
  nickname: string;
  phoneNumber: string;
  email: string;
}

// 유저 프로필 사진 업데이트 응답 데이터 (Service -> Controller)
export interface UpdateUserImageResponse {
  userId: string;
  profileImage: string;
}

// 유저 프로필 사진 업데이트 응답 데이터 (Repository -> Service)
export interface UpdateUserImageResponseDto {
  userId: string;
  profileImage: string;
}

// 리폼러 프로필 업데이트 응답 데이터 (Service -> Controller)
export interface UpdateReformerProfileResponse {
  reformerId: string;
  nickname: string;
  bio: string | null;
  keywords: string[] | null;
  profileImage: string | null;
}
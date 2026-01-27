import { AuthStatus, Role } from '../auth/auth.dto.js';
import { ReformerProfile } from './users.req.dto.js';

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

// 리폼러 프로필 업데이트 결과 데이터 (Repository -> Service)
export interface UpdateReformerProfileResult extends ReformerProfile {}

// 유저 프로필 사진 업데이트 결과 데이터 (Repository -> Service)
export interface UpdateUserImageResult {
  userId: string;
  profileUrl: string;
}


// 유저 프로필 업데이트 결과 데이터 (Repository -> Service)
export interface UpdateUserProfileResult {
  userId: string;
  nickname: string;
  phone: string;
  email: string;
}
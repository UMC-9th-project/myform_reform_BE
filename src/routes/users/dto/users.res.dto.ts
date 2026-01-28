import { AuthStatus, Role } from '../../auth/auth.dto.js';
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
  profileImageUrl: string;
}


// 유저 프로필 업데이트 결과 데이터 (Repository -> Service)
export interface UpdateUserProfileResult {
  userId: string;
  nickname: string;
  phone: string;
  email: string;
}


// 사용자 상세 정보 응답 데이터 service -> controller
export interface UserDetailInfoResponse {
  userId: string;
  role: Role;
  email: string;
  name: string;
  nickname: string;
  phone: string;
  profileImageUrl: string;
}

// 일반 유저 조회 결과 데이터 repository -> service
export type UserDetailInfoResult = Omit<UserDetailInfoResponse, 'role'>;
// 리폼러 조회 결과 데이터 repository -> service
export type ReformerDetailInfoResult = Omit<ReformerDetailInfoResponse, 'role'>;

// 리폼러 상세 정보 응답 데이터 service -> controller
export interface ReformerDetailInfoResponse {
  reformerId: string;
  role: Role;
  status: AuthStatus;
  email: string;
  name: string;
  nickname: string;
  phone: string;
  profileImageUrl: string;
  keywords: string[];
  bio: string;
  averageRating: number;
  reviewCount: number;
  totalSales: number;
}
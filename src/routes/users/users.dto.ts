import { AuthStatus, Role } from '../auth/auth.dto.js';

// 닉네임 중복 검사 응답 데이터
export interface CheckNicknameResponse {
    isAvailable: boolean;
    nickname: string;
    message: string;
  }

// 리폼러 상태 업데이트 요청 데이터 (Controller -> Service)
export interface UpdateReformerStatusRequest {
    status: AuthStatus;
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
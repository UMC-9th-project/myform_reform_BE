import { AuthStatus, Role } from '../auth/auth.dto.js';

export interface CheckNicknameResponse {
    isAvailable: boolean;
    nickname: string;
    message: string;
  }

export interface UpdateReformerStatusRequest {
    status: AuthStatus;
}

export interface UpdateReformerStatusResponse {
    user: {
        id: string;
        email: string;
        nickname: string;
        role: Role;
        auth_status: AuthStatus;
    };
}
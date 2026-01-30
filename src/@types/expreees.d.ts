import 'express';
import { AuthStatus, Role } from '../routes/auth/auth.dto.ts';

export interface CustomJwt {
  id: string;
  role: Role;
  auth_status?: AuthStatus;
  iat?: number; // JWT issued at
  exp?: number; // JWT expiration
}

declare global {
  namespace Express {
    export interface Request {
      user: CustomJwt;
    }
  }
}

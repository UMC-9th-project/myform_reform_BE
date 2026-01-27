import * as express from 'express';
import jwt from 'jsonwebtoken';
import { ForbiddenError, UnauthorizedError } from './auth.error.js';

/**
 * TSOA 전용 인증 핸들러 함수
 * @param request Express 요청 객체
 * @param securityName @Security('이름')에 들어갈 이름
 * @param _scope scopes 권한 범위
 * @returns 
 */
export function expressAuthentication(
  request: express.Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  const jwtSecret = process.env.JWT_SECRET || '';
  if (securityName === 'jwt') {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    return new Promise((resolve, reject) => {
      if (!token) reject(new UnauthorizedError('토큰이 없습니다.'));
      // Access Token 검증
      jwt.verify(token as string, jwtSecret, (err: any, decoded: any) => {
        if (err) reject(new UnauthorizedError('토큰이 유효하지 않은 Access Token입니다. 재로그인이 필요합니다.'));
        
        // 역할 권한 검증
        // 사용 예 : @Security('jwt', ['user'])
        if (scopes && scopes.length > 0) {
          if (!scopes.includes(decoded.role)) {
            reject(new UnauthorizedError('해당 리소스에 접근 권한이 없습니다.'));
          }
          // 리폼러 인증 상태 검증 
          // 사용 예 : @Security('jwt', ['reformer:approved'])
          if (scopes?.includes('reformer:approved')){
            if (decoded.role !== 'reformer' || decoded.auth_status !== 'APPROVED') {
              return reject(new ForbiddenError('리폼러 인증 상태가 승인되지 않았습니다.'));
            }
          } 
        }
        resolve(decoded);
      });
    });
  }

  if (securityName === 'jwt_refresh') {
    const token = request.cookies.refreshToken;
    return new Promise((resolve, reject) => {
      if (!token) reject(new UnauthorizedError('리프레시 토큰을 쿠키에서 찾을 수 없습니다.'));
      jwt.verify(token, jwtSecret, (err: any, decoded: any) => {
        if (err) {
          reject(new UnauthorizedError('리프레시 토큰이 유효하지 않은 Refresh Token입니다. 재로그인이 필요합니다.'));
        }
        resolve(decoded);
      });
    });
  }
  return Promise.resolve({});
}
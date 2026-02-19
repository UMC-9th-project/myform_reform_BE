import * as express from 'express';
import jwt from 'jsonwebtoken';
import { ForbiddenError, UnauthorizedError } from './auth.error.js';
import { redisClient, REDIS_KEYS } from '../../config/redis.js';

/**
 * TSOA 전용 인증 핸들러 함수
 * @param request Express 요청 객체
 * @param securityName @Security('이름')에 들어갈 이름
 * @param _scope scopes 권한 범위
 * @returns 
 */
export async function expressAuthentication(
  request: express.Request,
  securityName: string,
  scopes?: string[]
): Promise<any> {
  const jwtSecret = process.env.JWT_SECRET || '';
  if (securityName === 'jwt') {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const isBlacklisted = await redisClient.get(REDIS_KEYS.BLACKLIST(token));
    if (isBlacklisted) {
      throw new UnauthorizedError('이미 로그아웃된 토큰입니다. 다시 로그인해주세요.');
    }
    return new Promise((resolve, reject) => {
      if (!token) reject(new UnauthorizedError('토큰이 없습니다.'));     
      
      // Access Token 검증
      jwt.verify(token as string, jwtSecret, (err: any, decoded: any) => {
        if (err) reject(new UnauthorizedError('토큰이 유효하지 않은 Access Token입니다. 재로그인이 필요합니다.'));

        // 역할 권한 검증
        // 사용 예 : @Security('jwt', ['user'])
        if (scopes && scopes.length > 0) {
          // 마스터 권한 검증
          if (scopes.includes('master')) {
            const masterId = process.env.MASTER_REFORMER;
            if (decoded.id !== masterId) {
              return reject(new ForbiddenError('해당 리소스에 접근 권한이 없습니다. 마스터 리폼러만 접근 가능합니다.'));
            }
          }
          // 일반 역할 검증 (master가 아닌 다른 역할이 요구될 때)
          else if (!scopes.includes(decoded.role)) {
            reject(new ForbiddenError('해당 리소스에 접근 권한이 없습니다.'));
          }

          // 리폼러 인증 상태 검증 
          // 사용 예 : @Security('jwt', ['reformer:approved'])
          if (scopes?.includes('reformer:approved')) {
            if (decoded.role !== 'reformer' || decoded.auth_status !== 'APPROVED') {
              return reject(new ForbiddenError('리폼러 인증 상태가 승인되지 않았습니다.'));
            }
          }
        }
        resolve(decoded);
      });
    });
  }

  // 선택적 JWT 인증 - 토큰이 없어도 통과, 있으면 검증
  // 사용 예 : @Security('jwt_optional')
  if (securityName === 'jwt_optional') {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    return new Promise((resolve) => {
      if (!token) return resolve(null);

      jwt.verify(token as string, jwtSecret, (err: any, decoded: any) => {
        if (err) return resolve(null);
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
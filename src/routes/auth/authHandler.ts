import * as express from 'express';
import * as jwt from 'jsonwebtoken';

export function expressAuthentication(
  request: express.Request,
  securityName: string,
  _scope?: string[]
): Promise<any> {
  if (securityName === 'jwt') {
    const token = request.headers['authorization']?.split(' ')[1];

    return new Promise((resolve, reject) => {
      if (!token) reject(new Error('토큰이 없습니다.'));

      jwt.verify(token!, process.env.JWT_SECRET!, (err: any, decoded: any) => {
        if (err) reject(new Error('토큰이 유효하지 않습니다.'));
        resolve(decoded);
      });
    });
  }
  return Promise.resolve({});
}
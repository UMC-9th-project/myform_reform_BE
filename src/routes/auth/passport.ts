import passport from 'passport';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import express from 'express';
import { prisma } from '../../config/prisma.config.js';
import { account_role } from '@prisma/client';
import { InvalidStateError, UnknownAuthError } from './auth.error.js';

passport.use(new KakaoStrategy({
  clientID: process.env.KAKAO_CLIENT_ID || '',
  clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
  callbackURL: process.env.KAKAO_CALLBACK_URL || '',
  passReqToCallback: true
}, async (req: express.Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
  try {
    const state = req.query.state as string;
    if (state !== 'user' && state !== 'reformer') {
      return done(new InvalidStateError('state 값이 유효하지 않습니다. \'user\' 또는 \'reformer\' 중 하나여야 합니다.'));
    }
    
    const mode: 'user' | 'reformer' = state;
    const role: account_role = state === 'reformer' ? 'OWNER' : 'USER';
    const id = String(profile.id);
    const email = profile._json.kakao_account?.email || '';

    // prisma에서 유저 조회
    const socialUser = await prisma.social_account.findFirst({
      where: {
        provider: 'KAKAO',
        provider_id: id,
        role: role
      }
    });
    if (!socialUser) {
      // 신규 유저 - 회원가입 처리를 위한 정보 반환
      const signupInfo = {
        status: 'signup',
        kakaoId: id,
        email: email,
        role: mode
      };
      return done(null, signupInfo);
    }
    // 기존 유저 - 로그인 처리를 위한 정보 반환
    else {
      if (role === 'OWNER') {
        if (!socialUser.owner_id) {
          return done(new UnknownAuthError('DB의 social_account 테이블에서 사용자의 owner_id를 찾을 수 없습니다.'));
        }
        const owner = await prisma.owner.findUnique({
          where: {
            owner_id: socialUser.owner_id
          }
        });
        if (!owner) {
          return done(new UnknownAuthError('DB의 owner 테이블에서 owner_id와 일치하는 사용자를 찾을 수 없습니다.'));
        }
        const ownerInfo = {
          status: 'login',
          id: owner.owner_id,
          email: owner.email,
          role: mode,
          auth_status: owner.status
        };
        return done(null, ownerInfo);
      } else {
        if (!socialUser.user_id) {
          return done(new UnknownAuthError('DB의 social_account 테이블에서 사용자의 user_id를 찾을 수 없습니다.'));
        }
        const user = await prisma.user.findUnique({
          where: {
            user_id: socialUser.user_id
          }
        });
        if (!user) {
          return done(new UnknownAuthError('DB의 user 테이블에서 user_id와 일치하는 사용자를 찾을 수 없습니다.'));
        }
        const userInfo = {
          status: 'login',
          id: user.user_id,
          email: user.email,
          role: mode
        };
        return done(null, userInfo);
      }
    }
  } catch (error) {
    return done(error);
  }
}));

export default passport;
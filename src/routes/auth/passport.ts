import passport from 'passport';
import { Strategy as KakaoStrategy } from 'passport-kakao';
import express from 'express';
import { account_role } from '@prisma/client';
import { UnknownAuthError } from './auth.error.js';
import { Role } from './auth.dto.js';
import { UsersModel } from '../users/users.model.js';

const usersModel = new UsersModel();

passport.use(new KakaoStrategy({
  clientID: process.env.KAKAO_CLIENT_ID || '',
  clientSecret: process.env.KAKAO_CLIENT_SECRET || '',
  callbackURL: process.env.KAKAO_CALLBACK_URL || '',
  passReqToCallback: true
}, async (req: express.Request, accessToken: string, refreshToken: string, profile: any, done: any) => {
  // usersModel 인스턴스 생성 (DB 조회 시 사용)
  
  try {
    const state = req.query.state as string;
    const mode: Role = state as Role;
    const role: account_role = mode === 'reformer' ? 'OWNER' : 'USER';
    const id = String(profile.id);
    const email = profile._json.kakao_account?.email || '';

    // DB에서 social_account 테이블에서 사용자 정보 조회
    const socialUser = await usersModel.findSocialAccountByProviderId('KAKAO', id, role);
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
    // 역할(Role)에 맞는 ID 추출 및 상세 정보 조회
    const targetId = role === 'OWNER' ? socialUser.owner_id : socialUser.user_id;
    const tableName = role === 'OWNER' ? 'owner' : 'user';

    if(!targetId) {
      return done(new UnknownAuthError('DB의 social_account 테이블에서 사용자의 owner_id 또는 user_id를 찾을 수 없습니다.'));
    }

    const accountInfo = role === 'OWNER' 
      ? await usersModel.findReformerById(targetId) 
      : await usersModel.findUserById(targetId);

    if (!accountInfo) {
      return done(new UnknownAuthError(`DB의 ${tableName} 테이블에서 ${targetId}와 일치하는 사용자를 찾을 수 없습니다.`));
    }
    return done(null, {...accountInfo, status: 'login'});

  } catch (error) {
    return done(error);
  }
}));

export default passport;
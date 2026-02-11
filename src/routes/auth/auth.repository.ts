import { OwnerCreateInput, UserCreateInput } from './auth.model.js'
import prisma from "../../config/prisma.config.js";
import { UserCreateResponse, OwnerCreateResponse } from './auth.model.js'

export class AuthRepository {
  async createUser(dto: UserCreateInput): Promise<UserCreateResponse> {
    const { name, email, registration_type, oauthId, hashedPassword, nickname, phoneNumber, role, privacyPolicy } = dto;
    const dbRole = role === 'user' ? 'USER' : 'OWNER';
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email,
          hashed: (registration_type === 'LOCAL') ? hashedPassword : null,
          name: name,
          nickname: nickname,
          phone: phoneNumber,
          privacy_opt_in_at: privacyPolicy ? new Date() : null
        }
      });
      
      if (registration_type !== 'LOCAL') {
        await tx.social_account.create({
          data: {
            provider: registration_type,
            provider_id: oauthId as string,
            role: dbRole,
            user_id: user.user_id
          }
        });
      }
      return user;
    });  
    return {
      id: result.user_id,
      email: result.email,
      nickname: result.nickname,
      role: dbRole === 'USER' ? 'user' : 'reformer'
    } as UserCreateResponse
  }

  async createOwner(dto: OwnerCreateInput): Promise<OwnerCreateResponse> {
    const { 
      name, email, registration_type, oauthId, hashedPassword, 
      nickname, phoneNumber, role, privacyPolicy, 
      businessNumber, description, portfolioPhotos 
    } = dto;
    
    const dbRole = role === 'user' ? 'USER' : 'OWNER';
  
    const resultOwner = await prisma.$transaction(async (tx) => {
      // 1. 공통 회원 가입 데이터 생성
      const owner = await tx.owner.create({
        data: {
          email: email,
          hashed: (registration_type === 'LOCAL') ? hashedPassword : null,
          name: name,
          nickname: nickname,
          phone: phoneNumber,
          privacy_opt_in_at: privacyPolicy ? new Date() : null
        }
      });
  
      // 2. 리폼러 인증 데이터 생성
      await tx.reformer_auth.create({
        data: {
          owner_id: owner.owner_id,
          portfolio: description,
          photo: portfolioPhotos,
          business_number: businessNumber
        }
      });
  
      // 3. 소셜 계정 테이블에 데이터 생성
      if (registration_type !== 'LOCAL') {
        await tx.social_account.create({
          data: {
            provider: registration_type,
            provider_id: oauthId as string,
            role: dbRole,
            owner_id: owner.owner_id
          }
        });
      }
  
      return owner;
    });
  
    // 최종 응답 데이터 반환
    return {
      id: resultOwner.owner_id,
      email: resultOwner.email,
      nickname: resultOwner.nickname,
      role: dbRole === 'USER' ? 'user' : 'reformer',
      auth_status: resultOwner.status
    } as OwnerCreateResponse;
  }
}
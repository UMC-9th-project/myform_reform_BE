import prisma from '../../config/prisma.config.js';
import { UserCreateDto, UserCreateResponseDto } from './auth.dto.js';

export class AuthModel {
  private prisma;

  constructor() {
    this.prisma = prisma;
  }

  async createUser(dto: UserCreateDto): Promise<UserCreateResponseDto> {
    const { name, email, registration_type, oauthId, hashedPassword, nickname, phoneNumber, role, privacyPolicy } = dto;
    const dbRole = role === 'user' ? 'USER' : 'OWNER';
    
    // Local 회원가입
    if (registration_type === 'LOCAL') {
      const user = await this.prisma.user.create({
        data: {
          email: email,
          hashed: hashedPassword,
          name: name,
          nickname: nickname,
          phone: phoneNumber,
          privacy_opt_in_at: privacyPolicy ? new Date() : null,
        },
      });
      return {
        id: user.user_id,
        email: user.email as string,
        nickname: user.nickname as string,
        role: 'user',
      } as UserCreateResponseDto;
    }
    // Social 회원가입
    else{
      const user = await this.prisma.user.create({
        data: {
          email: email,
          name: name,
          nickname: nickname,
          phone: phoneNumber,
          privacy_opt_in_at: privacyPolicy ? new Date() : null,
        },
      });
      
      await this.prisma.social_account.create({
        data: {
          provider: registration_type as 'KAKAO' | 'GOOGLE' | 'APPLE',
          provider_id: oauthId as string,
          role: dbRole,
          user_id: user.user_id,
        },
      });

      return {
        id: user.user_id,
        email: user.email as string,
        nickname: user.nickname as string,
        role: dbRole === 'USER' ? 'user' : 'reformer',
      } as UserCreateResponseDto;
    }
  }
}
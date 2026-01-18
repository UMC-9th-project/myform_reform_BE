import prisma from '../../config/prisma.config.js';
import { UserCreateDto, UserCreateResponseDto, OwnerCreateDto, OwnerCreateResponseDto } from './auth.dto.js';

export class AuthModel {
  private prisma;

  constructor() {
    this.prisma = prisma;
  }

  async createUser(dto: UserCreateDto): Promise<UserCreateResponseDto> {
    const { name, email, registration_type, oauthId, hashedPassword, nickname, phoneNumber, role, privacyPolicy } = dto;
    const dbRole = role === 'user' ? 'USER' : 'OWNER';
    
    // Local 회원가입
    const user = await this.prisma.user.create({
      data: {
        email: email,
        hashed: (registration_type === 'LOCAL') ? hashedPassword : null,
        name: name,
        nickname: nickname,
        phone: phoneNumber,
        privacy_opt_in_at: privacyPolicy ? new Date() : null,
      },
    });
    
    // Social 회원가입
    if (registration_type !== 'LOCAL') {
    await this.prisma.social_account.create({
      data: {
        provider: registration_type,
        provider_id: oauthId as string,
        role: dbRole,
        user_id: user.user_id,
        },
      });
    }

    return {
      id: user.user_id,
      email: user.email,
      nickname: user.nickname,
      role: dbRole === 'USER' ? 'user' : 'reformer',
    } as UserCreateResponseDto;
  }

  async createOwner(dto: OwnerCreateDto): Promise<OwnerCreateResponseDto> {
    const { name, email, registration_type, oauthId, hashedPassword, nickname, phoneNumber, role, privacyPolicy, businessNumber, description, portfolioPhotos } = dto;
    const dbRole = role === 'user' ? 'USER' : 'OWNER';

    const owner = await this.prisma.owner.create({
      // 공통 회원 가입 데이터 생성 (로컬, 소셜 모두 동일)
      data: {
        email: email,
        hashed: (registration_type === 'LOCAL') ? hashedPassword : null,
        name: name,
        nickname: nickname,
        phone: phoneNumber,
        privacy_opt_in_at: privacyPolicy ? new Date() : null,
      },
    });
    const ownerId = owner.owner_id;

    // 리폼러 인증 데이터 생성 (로컬, 소셜 모두 동일)
    await this.prisma.reformer_auth.create({
      data: {
        owner_id : ownerId,
        portfolio : description,
        photo : portfolioPhotos as string[],
        business_number : businessNumber as string,
      },
    });

    // 소셜 계정 테이블에 데이터 생성
    if (registration_type !== 'LOCAL') {
    await this.prisma.social_account.create({
        data: {
          provider: registration_type,
          provider_id: oauthId as string,
          role: dbRole,
          owner_id: owner.owner_id,
        },
      });
    }
    return {
      id: owner.owner_id,
      email: owner.email,
      nickname: owner.nickname,
      role: dbRole === 'USER' ? 'user' : 'reformer',
      auth_status: owner.status,
    } as OwnerCreateResponseDto;
  }
}
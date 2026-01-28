import prisma from '../../config/prisma.config.js';
import { UserDetailInfoResponse, UsersInfoResponse } from './dto/users.res.dto.js';
import { Address, UpdateReformerStatusRequest } from './dto/users.req.dto.js';
import { account_role, delivery_address, owner, provider_type, social_account, user } from '@prisma/client';

export class UsersModel {
  private prisma;

  constructor() {
    this.prisma = prisma;
  }

  async updateReformerStatus(reformerId: string, requestBody: UpdateReformerStatusRequest): Promise<UsersInfoResponse> {
    const { status } = requestBody;
    const reformer = await this.prisma.owner.update({
      where: { owner_id: reformerId },
      data: { status: status }
    });
    return {
      id: reformer.owner_id,
      email: reformer.email as string,
      nickname: reformer.nickname as string,
      role: 'reformer',
      auth_status: reformer.status
    } as UsersInfoResponse;
  }

  async findUserByPhoneNumber(phoneNumber: string): Promise<UsersInfoResponse | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone: phoneNumber }
    });
    if (!user){
      return null;
    }
    return{
      id: user?.user_id as string,
      email: user?.email as string,
      nickname: user?.nickname as string,
      role: 'user',
      hashed: user?.hashed as string
    } as UsersInfoResponse;
  }

  async findReformerByPhoneNumber(phoneNumber: string): Promise<UsersInfoResponse | null> {
    const reformer = await this.prisma.owner.findUnique({
      where: { phone: phoneNumber }
    });
    if (!reformer){
      return null;
    }
    return{
      id: reformer?.owner_id as string,
      email: reformer?.email as string,
      nickname: reformer?.nickname as string,
      role: 'reformer',
      hashed: reformer?.hashed as string,
      auth_status: reformer?.status
    } as UsersInfoResponse;
  }

  async findUserByEmail(email: string): Promise<UsersInfoResponse | null> {
    const user = await this.prisma.user.findUnique({
      where: { email: email }
    });
    if (!user){
      return null;
    }
    return{
      id: user?.user_id as string,
      email: user?.email as string,
      nickname: user?.nickname as string,
      role: 'user',
      hashed: user?.hashed as string
    } as UsersInfoResponse;
  }

  async findReformerByEmail(email: string): Promise<UsersInfoResponse | null> {
    const reformer = await this.prisma.owner.findUnique({
      where: { email: email }
    });
    if (!reformer){
      return null;
    }
    return{
      id: reformer?.owner_id as string,
      email: reformer?.email as string,
      nickname: reformer?.nickname as string,
      role: 'reformer',
      auth_status: reformer?.status,
      hashed: reformer?.hashed as string
    } as UsersInfoResponse;
  }

  async findUserById(userId: string): Promise<UsersInfoResponse | null> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId }
    });
    if (!user){
      return null;
    }
    return{
      id: user?.user_id as string,
      email: user?.email as string,
      nickname: user?.nickname as string,
      role: 'user',
      hashed: user?.hashed as string
    } as UsersInfoResponse;
  }

  async findReformerById(userId: string): Promise<UsersInfoResponse | null> {
    const reformer = await this.prisma.owner.findUnique({
      where: { owner_id: userId }
    });
    if (!reformer){
      return null;
    }
    return{
      id: reformer?.owner_id as string,
      email: reformer?.email as string,
      nickname: reformer?.nickname as string,
      role: 'reformer',
      auth_status: reformer?.status,
      hashed: reformer?.hashed
    } as UsersInfoResponse;
  }

  async findSocialAccountByProviderId(provider: provider_type, providerId: string, role: account_role): Promise<social_account | null> {
    const socialAccount = await this.prisma.social_account.findFirst({
      where: { 
        provider: provider as provider_type, 
        provider_id: providerId, 
        role: role as account_role 
      }
    });
    if (!socialAccount){
      return null;
    }
    return socialAccount;
  }

  async isNicknameDuplicate(nickname: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { nickname: nickname }
    });

    const reformer = await this.prisma.owner.findUnique({
      where: { nickname: nickname }
    });
    return !!(user || reformer);
  }

  async findSocialAccountByProviderIdAndProviderTypeAndRole(providerId: string, providerType: provider_type, role: account_role): Promise<social_account | null> {
    const socialAccount = await this.prisma.social_account.findFirst({
      where: { 
        provider: providerType, 
        provider_id: providerId, 
        role: role 
      }
    });
    if (!socialAccount){
      return null;
    }
    return socialAccount;
  }

  // Email과 Role을 기반으로 소셜 계정 조회
  async findSocialAccountByEmailAndRole(email: string, role: account_role ): Promise<social_account | null> {
    const account = role === 'USER'
      ? await this.prisma.user.findUnique({
        where: {
          email: email
        }
      })
      : await this.prisma.owner.findUnique({
        where: {
          email: email
        }
      });
    
    // 계정이 존재하면 소셜 계정 조회
    if (account) {
      const socialAccount = (await this.prisma.social_account.findFirst({
        where: {
          role: role as account_role,
          user_id: role === 'USER' ? (account as user).user_id as string : undefined,
          owner_id: role === 'OWNER' ? (account as owner).owner_id as string : undefined
        }
      })) as social_account;
      if (socialAccount) {
        return socialAccount;
      }
    }
    return null;
  }

  async findUserDetailInfo(userId: string): Promise<UserDetailInfoResponse | null> {
    const user = await this.prisma.user.findUnique({
      where: { user_id: userId }
    });
    if (!user){
      return null;
    }
    return{
      userId: user?.user_id,
      email: user?.email,
      name: user?.name ?? '',
      nickname: user?.nickname,
      phone: user?.phone,
      profileImageUrl: user?.profile_photo ?? '',
      role: 'user'
    } as UserDetailInfoResponse;
  }
}
import { DatabaseError } from "./users.error.js";
import { 
  UpdateReformerProfileParams, 
  UpdateReformerStatusRequestDto, 
  UpdateUserProfileParams 
} from "./dto/users.req.dto.js";
import {
  UsersInfoResponseDto
} from "./dto/users.res.dto.js";
import prisma from "../../config/prisma.config.js";
import { reformer_status_enum, account_role,  provider_type, user, owner, social_account } from "@prisma/client";
import { RawUserPorfile, rawReformerPortfolio } from './users.model.js';

export class UsersRepository {
  async updateUserProfile(updateUserProfileParams: UpdateUserProfileParams): Promise<user> {
    const data = updateUserProfileParams.toPrismaUpdateData();
    try {
    const user = await prisma.user.update({
      where: { user_id: updateUserProfileParams.userId },
      data: data
    });
    return user;
    } catch (error) {
      console.error(error);
      throw new DatabaseError('유저 프로필 업데이트 중 DB에서 오류가 발생했습니다.');
    }
  }

  async updateReformerProfile(updateReformerProfileParams: UpdateReformerProfileParams): Promise<owner> {
    const data = updateReformerProfileParams.toPrismaUpdateData();
    try {
      const reformer = await prisma.owner.update({
        where: { owner_id: updateReformerProfileParams.reformerId },
        data: data,
      });
      return reformer;
    } catch (error) {
      console.error(error);
      throw new DatabaseError('리폼러 프로필 업데이트 중 DB에서 오류가 발생했습니다.');
    }
  }

  // 유저 조회
  async findUserbyUserId(userId: string): Promise<user | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { user_id: userId },
      });
      return user;
    } catch (error) {
      console.error(error);
      throw new DatabaseError('유저 조회 중 DB에서 오류가 발생했습니다.');
    }
  }

  async findReformerbyReformerId(reformerId: string): Promise<owner | null> {
    const reformer = await prisma.owner.findUnique({
      where: { owner_id: reformerId },
    });
    return reformer;
  }

  async getUserProfile(userId: string): Promise<RawUserPorfile | null> {
    const userProfile = await prisma.user.findUnique({
      where: {
        user_id: userId
      },
      select: {
        user_id: true,
        email: true,
        name: true,
        nickname: true,
        phone: true,
        profile_photo: true
      }
    })
    return userProfile
  }

  async getReformerPortfolios(
    status: reformer_status_enum | 'ALL',
    page: number,
    limit: number,
    order: 'asc' | 'desc'
  ): Promise<{ totalCount: number; items: rawReformerPortfolio[] }> {
    const whereCondition = status !== 'ALL' ? { status } : {};
    const [totalCount, items] = await Promise.all([
      prisma.owner.count({ where : whereCondition }),
      prisma.owner.findMany({
        where: whereCondition,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          owner_id: true,
          status: true,
          email: true,
          name: true,
          nickname: true,
          phone: true,
          reformer_auth: {
            select: {
              portfolio: true,
              photo: true,
              business_number: true
            }
          }
        },
        orderBy: {
          created_at: order
        }
      })
    ])
    return { totalCount, items };
  }

  async findUserByEmail(email: string): Promise<UsersInfoResponseDto | null> {
    const user = await prisma.user.findUnique({
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
    };
  }

  async findReformerByEmail(email: string): Promise<UsersInfoResponseDto | null> {
    const reformer = await prisma.owner.findUnique({
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
    };
  }

  async findUserSocialAccountById(userId: string): Promise<social_account | null>{
    const socialAccount = await prisma.social_account.findFirst({
      where: {
        role: 'USER',
        user_id : userId
      }
    })
    return socialAccount
  }

  async findReformerSocialAccountById(reformerId: string): Promise<social_account | null>{
    const socialAccount = await prisma.social_account.findFirst({
      where: {
        role: 'OWNER',
        user_id : reformerId
      }
    })
    return socialAccount
  }

  async isUserNicknameDuplicate(nickname: string): Promise<boolean> {
    const user = await prisma.user.findFirst({
      where: { nickname: nickname }
    });
    return !!(user);
  }

  async isReformerNicknameDuplicate(nickname: string): Promise<boolean> {
    const reformer = await prisma.owner.findFirst({
      where: { nickname: nickname }
    });
    return !!(reformer);
  }

  async updateReformerStatus(reformerId: string, requestBody: UpdateReformerStatusRequestDto): Promise<UsersInfoResponseDto> {
    const { status } = requestBody;
    const reformer = await prisma.owner.update({
      where: { owner_id: reformerId },
      data: { status: status }
    });
    return {
      id: reformer.owner_id,
      email: reformer.email as string,
      nickname: reformer.nickname as string,
      role: 'reformer',
      auth_status: reformer.status
    };
  }

  async findUserByPhoneNumber(phoneNumber: string): Promise<UsersInfoResponseDto | null> {
    const user = await prisma.user.findUnique({
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
    };
  }

  async findReformerByPhoneNumber(phoneNumber: string): Promise<UsersInfoResponseDto | null> {
    const reformer = await prisma.owner.findUnique({
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
    };
  }

  async findUserById(userId: string): Promise<UsersInfoResponseDto | null> {
    const user = await prisma.user.findUnique({
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
    };
  }

  async findReformerById(userId: string): Promise<UsersInfoResponseDto | null> {
    const reformer = await prisma.owner.findUnique({
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
    } as UsersInfoResponseDto;
  }

  async findSocialAccountByProviderId(
    provider: provider_type, 
    providerId: string, 
    role: account_role
    ): Promise<social_account | null> {
    const socialAccount = await prisma.social_account.findFirst({
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

  async findSocialAccountByProviderIdAndProviderTypeAndRole(
    providerId: string, 
    providerType: provider_type, 
    role: account_role
  ): Promise<social_account | null> {
    const socialAccount = await prisma.social_account.findFirst({
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
}
import { DatabaseError } from "./users.error.js";
import { UpdateReformerProfileParams, UpdateUserImageParams, UpdateUserProfileParams } from "./dto/users.req.dto.js";
import { UpdateReformerProfileResult, UpdateUserImageResult, UpdateUserProfileResult } from "./dto/users.res.dto.js";
import prisma from "../../config/prisma.config.js";
import { user, owner } from "@prisma/client";

export class UsersRepository {
  async updateUserProfile(updateUserProfileParams: UpdateUserProfileParams): Promise<UpdateUserProfileResult> {
    const { userId, ...rest } = updateUserProfileParams;
    try {
    const user = await prisma.user.update({
      where: { user_id: userId },
      data: rest,
      select: {
        user_id: true,
        nickname: true,
        phone: true,
        email: true,
      }
    });
    const result: UpdateUserProfileResult = {
      userId: user.user_id,
      nickname: user.nickname as string,
      phone: user.phone as string,
      email: user.email as string
    };
      return result;
    } catch (error) {
      console.error(error);
      throw new DatabaseError('유저 프로필 업데이트 중 DB에서 오류가 발생했습니다.');
    }
  }

  async updateUserImage(updateUserImageParams: UpdateUserImageParams): Promise<UpdateUserImageResult> {
    const { userId, profileImageUrl } = updateUserImageParams;
    try {
      const user = await prisma.user.update({
        where: { user_id: userId },
        data: { profile_photo: profileImageUrl },
        select: {
          user_id: true,
          profile_photo: true
        }
      });
      const result: UpdateUserImageResult = {
        userId: user.user_id,
        profileImageUrl: user.profile_photo as string,
      };
      return result;
    } catch (error) {
      console.error(error);
      throw new DatabaseError('유저 프로필 사진 업데이트 중 DB에서 오류가 발생했습니다.');
    }
  }

  async getProfileImage(userId: string): Promise<string | null> {
    try {
      const profileImageUrl = await prisma.user.findUnique({
        where: { user_id: userId },
        select: { profile_photo: true }
      });
      return profileImageUrl?.profile_photo || null;
    } catch (error) {
      console.error(error);
      throw new DatabaseError('유저 프로필 사진 조회 중 DB에서 오류가 발생했습니다.');
    }
  }

  async updateReformerProfile(updateReformerProfileParams: UpdateReformerProfileParams): Promise<UpdateReformerProfileResult> {
    const { reformerId, nickname, bio, keywords, profileImageUrl } = updateReformerProfileParams;
    try {
      const reformer = await prisma.owner.update({
        where: { owner_id: reformerId },
        data: {
          nickname: nickname,
          bio: bio,
          keywords: keywords,
          profile_photo: profileImageUrl,
        },
        select: {
          owner_id: true,
          nickname: true,
          bio: true,
          keywords: true,
          profile_photo: true,
        }
      });
      const result: UpdateReformerProfileResult = {
        reformerId: reformer.owner_id as string,
        nickname: reformer.nickname || undefined,
        bio: reformer.bio ?? "",
        keywords: reformer.keywords || [],
        profileImageUrl: reformer.profile_photo ?? "",
      };
      return result;
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
    try {
      const reformer = await prisma.owner.findUnique({
        where: { owner_id: reformerId },
      });
      return reformer;
    } catch (error) {
      console.error(error);
      throw new DatabaseError('리폼러 조회 중 DB에서 오류가 발생했습니다.');
    }
  }
}
import { DatabaseError } from "./users.error.js";
import { UpdateUserImageParams, UpdateUserProfileParams } from "./users.req.dto.js";
import { UpdateUserImageResult, UpdateUserProfileResult } from "./users.res.dto.js";
import prisma from "../../config/prisma.config.js";

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
    const { userId, profileUrl } = updateUserImageParams;
    try {
      const user = await prisma.user.update({
        where: { user_id: userId },
        data: { profile_photo: profileUrl },
        select: {
          user_id: true,
          profile_photo: true
        }
      });
      const result: UpdateUserImageResult = {
        userId: user.user_id,
        profileUrl: user.profile_photo as string,
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
}
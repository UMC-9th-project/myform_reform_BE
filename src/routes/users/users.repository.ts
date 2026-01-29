import { DatabaseError } from "./users.error.js";
import { UpdateReformerProfileParams, UpdateUserProfileParams } from "./dto/users.req.dto.js";
import prisma from "../../config/prisma.config.js";
import { user, owner } from "@prisma/client";

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
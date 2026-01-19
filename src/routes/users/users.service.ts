import { CheckNicknameResponse } from './users.dto.js';
import { validateNickname } from '../../utils/validators.js';
import { UsersModel } from './users.model.js';
import { UpdateReformerStatusRequest, UpdateReformerStatusResponse } from './users.dto.js';
import { NicknameDuplicateError, UnknownAuthError } from '../auth/auth.error.js';
import prisma from '../../config/prisma.config.js';

export class UsersService {

  private usersModel: UsersModel;
  constructor() {
    this.usersModel = new UsersModel();
  }

  async updateReformerStatus(reformerId: string, requestBody: UpdateReformerStatusRequest): Promise<UpdateReformerStatusResponse> {
    const result = await this.usersModel.updateReformerStatus(reformerId, requestBody);
    return result as UpdateReformerStatusResponse;
  }

  async checkNickname(nickname: string): Promise<CheckNicknameResponse> {
    await validateNickname(nickname);
    try {
      await this.checkNicknameDuplicate(nickname);
      return {
        isAvailable: true,
        nickname: nickname,
        message: '사용 가능한 닉네임입니다.'
      } as CheckNicknameResponse;
    } catch (error) {
      if (error instanceof NicknameDuplicateError) {
        return {
          isAvailable: false,
          nickname: nickname,
          message: '이미 존재하는 닉네임입니다.'
        } as CheckNicknameResponse;
      }
      throw new UnknownAuthError('닉네임 검증 중 알 수 없는 오류가 발생했습니다.');
    }    
        
  }

  // 닉네임 중복 검증
  async checkNicknameDuplicate(nickname: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: {
        nickname: nickname
      }
    });
    const reformer = await prisma.owner.findUnique({
      where: {
        nickname: nickname
      }
    });
    if (user || reformer){
      throw new NicknameDuplicateError('이미 존재하는 닉네임입니다.');
    }
  }
}
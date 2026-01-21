import { CheckNicknameResponse, UsersInfoResponse, UpdateReformerStatusRequest } from './users.dto.js';
import { validateNickname } from '../../utils/validators.js';
import { UsersModel } from './users.model.js';
import { EmailDuplicateError, UnknownAuthError } from '../auth/auth.error.js';
import { NicknameDuplicateError, PhoneNumberDuplicateError } from './users.error.js';
import prisma from '../../config/prisma.config.js';

export class UsersService {

  private usersModel: UsersModel;
  constructor() {
    this.usersModel = new UsersModel();
  }

  // 리폼러 상태 업데이트
  async updateReformerStatus(reformerId: string, requestBody: UpdateReformerStatusRequest): Promise<UsersInfoResponse> {
    const result = await this.usersModel.updateReformerStatus(reformerId, requestBody);
    return result as UsersInfoResponse;
  }

  // 닉네임 중복 검사 (가능 여부 반환)
  async checkNickname(nickname: string): Promise<CheckNicknameResponse> {
    await validateNickname(nickname);
    try {
      const isDuplicate = await this.usersModel.isNicknameDuplicate(nickname);
      if (isDuplicate) {
        return {
          isAvailable: false,
          nickname: nickname,
          message: '이미 존재하는 닉네임입니다.'
        } as CheckNicknameResponse;
      } else {
        return {
          isAvailable: true,
          nickname: nickname,
          message: '사용 가능한 닉네임입니다.'
        } as CheckNicknameResponse;
      }
    } catch (error) {
      throw new UnknownAuthError('닉네임 검증 중 알 수 없는 오류가 발생했습니다.');
    }
  }
}
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

  // 닉네임 중복 검증 (중복 시 에러 발생)
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

  async checkPhoneNumberDuplicate(phoneNumber: string, role: 'user' | 'reformer'): Promise<void> {
    if (role === 'user'){
      const userExists = await this.usersModel.findUserByPhoneNumber(phoneNumber);
      if (userExists) throw new PhoneNumberDuplicateError('이미 존재하는 전화번호입니다.');
    } else if (role === 'reformer'){
      const reformerExists = await this.usersModel.findReformerByPhoneNumber(phoneNumber);
      if (reformerExists) throw new PhoneNumberDuplicateError('이미 존재하는 전화번호입니다.');
    } else {
      throw new UnknownAuthError('전화번호 검증 중 알 수 없는 오류가 발생했습니다.');
    }
  }

    // 이메일 중복 검증
    async checkEmailDuplicate(email: string, role: 'user' | 'reformer'): Promise<void> {
      if (role === 'user'){
        const userExists = await this.usersModel.findUserByEmail(email);
        if (userExists){
          throw new EmailDuplicateError('이미 존재하는 사용자 이메일입니다.');
        }
      }
      
      if (role === 'reformer'){
        const reformerExists = await this.usersModel.findReformerByEmail(email);
        if (reformerExists){
          throw new EmailDuplicateError('이미 존재하는 리폼러 이메일입니다.');
        }
      }
    }
}
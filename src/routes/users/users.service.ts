import { CheckNicknameResponse, UpdateUserProfileResponseDto, UsersInfoResponse, UpdateReformerProfileResponseDto, UserDetailInfoResponseDto, ReformerDetailInfoResponseDto } from './dto/users.res.dto.js';
import { UpdateReformerStatusRequest, UpdateUserProfileParams, UpdateUserProfileRequestDto, UpdateReformerProfileRequestDto, UpdateReformerProfileParams } from './dto/users.req.dto.js';
import { validateNickname } from '../../utils/validators.js';
import { UsersModel } from './users.model.js';
import { EmailDuplicateError, UnknownAuthError, AccountNotFoundError } from '../auth/auth.error.js';
import { NicknameDuplicateError, PhoneNumberDuplicateError } from './users.error.js';
import { UsersRepository } from './users.repository.js';
import { AuthStatus } from '../auth/auth.dto.js';

export class UsersService {

  private usersRepository: UsersRepository;
  private usersModel: UsersModel;
  constructor() {
    this.usersRepository = new UsersRepository();
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

  // 유저 프로필 업데이트
  async updateUserProfile(userId: string, requestBody: UpdateUserProfileRequestDto): Promise<UpdateUserProfileResponseDto> {
    const {nickname, phone, email} = requestBody;
    if (nickname !== undefined) {
      await this.checkNicknameDuplicate(nickname);
    }
    if (phone !== undefined) {
      await this.checkPhoneNumberDuplicate(phone, userId);
    }
    if (email !== undefined) {
      await this.checkEmailDuplicate(email, userId);
    }

    const updateUserProfileParams = new UpdateUserProfileParams({
      userId: userId,
      ...requestBody
    })
    const updatedUser = await this.usersRepository.updateUserProfile(updateUserProfileParams);
    const updatedUserProfileResult = new UpdateUserProfileResponseDto(updatedUser);
    return updatedUserProfileResult;
  }

  // 리폼러 프로필 업데이트
  async updateReformerProfile(reformerId: string, requestBody: UpdateReformerProfileRequestDto): Promise<UpdateReformerProfileResponseDto> {
    const updateReformerProfileParams = new UpdateReformerProfileParams({
      reformerId: reformerId,
      ...requestBody
    })
    if (updateReformerProfileParams.nickname !== undefined) {
      await this.checkNicknameDuplicate(updateReformerProfileParams.nickname);
    }
    const updatedReformer = await this.usersRepository.updateReformerProfile(updateReformerProfileParams);
    const updatedReformerProfileResult = new UpdateReformerProfileResponseDto(updatedReformer);
    return updatedReformerProfileResult;
  }
  
  private async checkNicknameDuplicate(nickname: string): Promise<void> {
    const isDuplicate = await this.usersModel.isNicknameDuplicate(nickname);
    if (isDuplicate) {
      throw new NicknameDuplicateError('이미 존재하는 닉네임입니다.');
    }
  }

  // 전화번호 유효성 및 중복 검사
  private async checkPhoneNumberDuplicate(phone: string, userId: string): Promise<void> {
    const user = await this.usersModel.findUserByPhoneNumber(phone as string);
    if (user && user.id !== userId) {
      throw new PhoneNumberDuplicateError('이미 존재하는 전화번호입니다.');
    }
  }
  // 이메일 유효성 및 중복 검사
  private async checkEmailDuplicate(email: string, userId: string): Promise<void> {
    const user = await this.usersModel.findUserByEmail(email as string);
    if (user && user.id !== userId) {
      throw new EmailDuplicateError('이미 존재하는 이메일입니다.');
    }
  }

  // 사용자 정보 조회
  async getUserDetailInfo(userId: string): Promise<UserDetailInfoResponseDto> {
    const user = await this.usersRepository.findUserbyUserId(userId);
    if (user) {
      const userDetailInfo = new UserDetailInfoResponseDto(user);
      return userDetailInfo;
    }
    throw new AccountNotFoundError('존재하지 않는 사용자입니다.');
  }

  // 리폼러 정보 조회
  async getReformerDetailInfo(reformerId: string): Promise<ReformerDetailInfoResponseDto> {
    const reformer = await this.usersRepository.findReformerbyReformerId(reformerId);
    if (reformer) {
      const reformerDetailInfo = new ReformerDetailInfoResponseDto(reformer);
      return reformerDetailInfo;
    }
    throw new AccountNotFoundError('존재하지 않는 리폼러입니다.');
  }
}

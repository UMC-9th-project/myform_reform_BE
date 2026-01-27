import { CheckNicknameResponse, UpdateUserImageResult, UpdateUserProfileResult, UsersInfoResponse } from './users.res.dto.js';
import { UpdateReformerStatusRequest, UpdateUserImageParams, UpdateUserProfileParams, UpdateUserProfileRequest } from './users.req.dto.js';
import { validateEmail, validateNickname, validatePhoneNumber } from '../../utils/validators.js';
import { UsersModel } from './users.model.js';
import { EmailDuplicateError, UnknownAuthError } from '../auth/auth.error.js';
import { NicknameDuplicateError, PhoneNumberDuplicateError } from './users.error.js';
import { UsersRepository } from './users.repository.js';
import { S3 } from '../../config/s3.js';

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
  async updateUserProfile(userId: string, requestBody: UpdateUserProfileRequest): Promise<UpdateUserProfileResult> {
    const {nickname, phone, email} = requestBody;
    if (nickname) {
      await this.validateAndCheckNickname(nickname);
    }
    if (phone) {
      await this.validateAndCheckPhoneNumber(phone, userId);
    }
    if (email) {
      await this.validateAndCheckEmail(email, userId);
    }

    const updateUserProfileParams: UpdateUserProfileParams = {
      userId: userId,
      ...requestBody
    };
    const updatedProfileResult = await this.usersRepository.updateUserProfile(updateUserProfileParams);
    return updatedProfileResult;
  }

  private async validateAndCheckNickname(nickname: string): Promise<void> {
    validateNickname(nickname);
    const isDuplicate = await this.usersModel.isNicknameDuplicate(nickname);
    if (isDuplicate) {
      throw new NicknameDuplicateError('이미 존재하는 닉네임입니다.');
    }
  }

  private async validateAndCheckPhoneNumber(phone: string, userId: string): Promise<void> {
    validatePhoneNumber(phone as string);
    const user = await this.usersModel.findUserByPhoneNumber(phone as string);
    if (user && user.id !== userId) {
      throw new PhoneNumberDuplicateError('이미 존재하는 전화번호입니다.');
    }
  }
  private async validateAndCheckEmail(email: string, userId: string): Promise<void> {
    validateEmail(email as string);
    const user = await this.usersModel.findUserByEmail(email as string);
    if (user && user.id !== userId) {
      throw new EmailDuplicateError('이미 존재하는 이메일입니다.');
    }
  }

  // 유저 프로필 사진 업데이트
  async updateUserImage(userId: string, profileImage: Express.Multer.File): Promise<UpdateUserImageResult> {
    const s3 = new S3();
    const originalProfileImageUrl = await this.usersRepository.getProfileImage(userId);
    if (originalProfileImageUrl) {
      await s3.deleteFromS3(originalProfileImageUrl);
    }
    const profileImageUrl = await s3.uploadToS3(profileImage);
    const updateUserImageParams: UpdateUserImageParams = {
      userId: userId,
      profileUrl: profileImageUrl
    };
    const updatedImageResult = await this.usersRepository.updateUserImage(updateUserImageParams);
    return updatedImageResult;
  }
}

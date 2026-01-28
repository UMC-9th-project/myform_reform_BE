import { CheckNicknameResponse, UpdateUserImageResult, UpdateUserProfileResult, UsersInfoResponse, UpdateReformerProfileResult, UserDetailInfoResponse, ReformerDetailInfoResponse } from './dto/users.res.dto.js';
import { UpdateReformerStatusRequest, UpdateUserImageParams, UpdateUserProfileParams, UpdateUserProfileRequest, UpdateReformerProfileRequest, UpdateReformerProfileParams } from './dto/users.req.dto.js';
import { validateEmail, validateNickname, validatePhoneNumber, validateBio } from '../../utils/validators.js';
import { UsersModel } from './users.model.js';
import { EmailDuplicateError, UnknownAuthError, InputValidationError, AccountNotFoundError } from '../auth/auth.error.js';
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

  // 리폼러 프로필 업데이트
  async updateReformerProfile(reformerId: string, requestBody: UpdateReformerProfileRequest): Promise<UpdateReformerProfileResult> {
    const {nickname, bio, keywords, profileImageUrl} = requestBody;
    if (nickname) {
      await this.validateAndCheckNickname(nickname);
    }
    if (bio) {
      await validateBio(bio);
    }
    const processedKeywords = (keywords !== undefined)
      ? await this.processKeywords(keywords)
      : [];
    const updateReformerProfileParams: UpdateReformerProfileParams = {
      reformerId: reformerId,
      nickname: nickname,
      bio: bio,
      keywords: processedKeywords,
      profileImageUrl: profileImageUrl,
    };
    const updatedProfileResult = await this.usersRepository.updateReformerProfile(updateReformerProfileParams);
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
  async updateUserImage(userId: string, profileImageUrl: string): Promise<UpdateUserImageResult> {
    const updateUserImageParams: UpdateUserImageParams = {
      userId: userId,
      profileImageUrl: profileImageUrl
    };
    const updatedImageResult = await this.usersRepository.updateUserImage(updateUserImageParams);
    return updatedImageResult;
  }

  // 사용자 정보 조회
  async getUserDetailInfo(userId: string): Promise<UserDetailInfoResponse> {
    const user = await this.usersRepository.findUserbyUserId(userId);
    if (user) {
      const userDetailInfo: UserDetailInfoResponse = {
        userId: user.user_id,
        role: 'user',
        email: user.email as string,
        name: user.name as string,
        nickname: user.nickname as string,
        phone: user.phone as string,
        profileImageUrl: user.profile_photo ?? ''
      };
      return userDetailInfo;
    }
    throw new AccountNotFoundError('존재하지 않는 사용자입니다.');
  }

  async getReformerDetailInfo(reformerId: string): Promise<ReformerDetailInfoResponse> {
    const reformer = await this.usersRepository.findReformerbyReformerId(reformerId);
    if (reformer) {
      const reformerDetailInfo: ReformerDetailInfoResponse = {
        reformerId: reformer.owner_id,
        role: 'reformer',
        email: reformer.email as string,
        name: reformer.name as string,
        nickname: reformer.nickname as string,
        phone: reformer.phone as string,
        profileImageUrl: reformer.profile_photo ?? '',
        status: reformer.status as AuthStatus,
        keywords: reformer.keywords ?? [],
        bio: reformer.bio ?? '',
        averageRating: reformer.avg_star?.toNumber() ?? 0,
        reviewCount: reformer.review_count ?? 0,
        totalSales: reformer.trade_count ?? 0,
      };
      return reformerDetailInfo;
    }
    throw new AccountNotFoundError('존재하지 않는 리폼러입니다.');
  }

  private async processKeywords(keywords: string[]): Promise<string[]> {
    if (keywords.length > 3) {
      throw new InputValidationError('키워드의 개수가 올바르지 않습니다. 3개 이하로 입력해주세요.');
    }
    const uniqueKeywords = [...new Set(
      keywords
        .map(keyword => keyword.trim())
        .filter(keyword => keyword.length > 0)
    )];
    return uniqueKeywords;
  }
}

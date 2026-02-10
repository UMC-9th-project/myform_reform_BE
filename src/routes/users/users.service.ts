import { 
  UpdateUserProfileResponseDto, 
  UsersInfoResponseDto, 
  UpdateReformerProfileResponseDto, 
  UserDetailInfoResponseDto, 
  ReformerDetailInfoResponseDto,
  ReformerPortfolioDto,
  CheckNicknameResponseDto
} from './dto/users.res.dto.js';
import { SolapiMessageService} from 'solapi';
import { 
  UpdateReformerStatusRequestDto, 
  UpdateUserProfileParams, 
  UpdateUserProfileRequestDto,
  UpdateReformerProfileRequestDto, 
  UpdateReformerProfileParams 
} from './dto/users.req.dto.js';
import { validateNickname } from '../../utils/validators.js';
import { 
  UserProfile
} from './users.model.js';
import { 
  EmailDuplicateError,
  UnknownAuthError, 
  AccountNotFoundError, 
  SmsProviderError
} from '../auth/auth.error.js';
import { 
  NicknameDuplicateError, 
  PhoneNumberDuplicateError 
} from './users.error.js';
import { UsersRepository } from './users.repository.js';
import { AuthStatus } from '../auth/dto/auth.dto.js';
import { reformer_status_enum } from '@prisma/client';

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || '',
  process.env.SOLAPI_API_SECRET || ''
);

export class UsersService {

  private usersRepository: UsersRepository;
  constructor() {
    this.usersRepository = new UsersRepository();
  }

  // 리폼러 상태 업데이트
  async updateReformerStatus(reformerId: string, requestBody: UpdateReformerStatusRequestDto): Promise<UsersInfoResponseDto> {
    const reformer = await this.usersRepository.findReformerbyReformerId(reformerId);
    if (!reformer) {
      throw new AccountNotFoundError('리폼러의 계정이 존재하지 않습니다.')
    }
    const result = await this.usersRepository.updateReformerStatus(reformerId, requestBody);
    
    
    if (result.auth_status && reformer.status !== result.auth_status) {
      this.sendNotificationSms(reformer.phone, result.auth_status).catch(err => {
        console.error(`[SMS 전송 실패] ID: ${reformerId}, Error: ${err.message}`)
      })
    }
    return result;
  }

  // 닉네임 중복 검사 (가능 여부 반환)
  async checkNickname(nickname: string): Promise<CheckNicknameResponseDto> {
    await validateNickname(nickname);
    try {
      const isUserDuplicate = await this.usersRepository.isUserNicknameDuplicate(nickname);
      const isReformerDuplicate = await this.usersRepository.isReformerNicknameDuplicate(nickname);
      if (isUserDuplicate || isReformerDuplicate) {
        return {
          isAvailable: false,
          nickname: nickname,
          message: '이미 존재하는 닉네임입니다.'
        };
      } else {
        return {
          isAvailable: true,
          nickname: nickname,
          message: '사용 가능한 닉네임입니다.'
        };
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
    const isDuplicate = (
      await this.usersRepository.isUserNicknameDuplicate(nickname)
      || await this.usersRepository.isReformerNicknameDuplicate(nickname));
    if (isDuplicate) {
      throw new NicknameDuplicateError('이미 존재하는 닉네임입니다.');
    }
  }

  // 전화번호 유효성 및 중복 검사
  private async checkPhoneNumberDuplicate(phone: string, userId: string): Promise<void> {
    const user = await this.usersRepository.findUserByPhoneNumber(phone as string);
    if (user && user.id !== userId) {
      throw new PhoneNumberDuplicateError('이미 존재하는 전화번호입니다.');
    }
  }
  // 이메일 유효성 및 중복 검사
  private async checkEmailDuplicate(email: string, userId: string): Promise<void> {
    const user = await this.usersRepository.findUserByEmail(email as string);
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

  // 일반 유저 프로필 조회
  async getUserProfile(userId: string): Promise<UserProfile> {
    const userProfile = await this.usersRepository.getUserProfile(userId);
    if (!userProfile){
      throw new AccountNotFoundError('존재하지 않는 유저 계정입니다.')
    }
    return UserProfile.create(userProfile)
  }

  // 리폼러 포트폴리오 정보 조회
  async getReformerPortfolios(status: reformer_status_enum): Promise<ReformerPortfolioDto[]> {
    const reformerPortfolios = await this.usersRepository.getReformerPortfolios(status);
    const dtos : ReformerPortfolioDto[] = reformerPortfolios.map((item) => {
      return ReformerPortfolioDto.fromRaw(item)
    })
    return dtos
  }

  private async sendNotificationSms(phone: string | null, status: string) {
    if (!phone) return;

    const statusMap: Record<string, string> = {
      'APPROVED': '승인',
      'REJECTED': '승인 거부',
      'PENDING': '대기 상태로 변경'
    };

    const resultStatus = statusMap[status] || '처리';
    const textMessage = `[내폼리폼] 프로필 검토 결과 ${resultStatus}되었음을 알려드립니다.`;

    try {
      await messageService.send({
        to: phone,
        from: process.env.SOLAPI_PHONE_NUMBER!,
        text: textMessage
      });
    } catch (error: any) {
      throw new SmsProviderError(`SMS API 요청 실패 : ${error.message}`);
    }
  }
}
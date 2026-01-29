import { AuthStatus, Role } from '../../auth/auth.dto.js';
import { owner, user } from '@prisma/client';

// 닉네임 중복 검사 응답 데이터
export interface CheckNicknameResponse {
  isAvailable: boolean;
  nickname: string;
  message: string;
}

// 유저 정보 응답 데이터
export interface UsersInfoResponse {
  id: string;
  email: string;
  nickname: string;
  hashed?: string;
  role: Role;
  auth_status?: AuthStatus;
}

// 리폼러 프로필 업데이트 응답 데이터 (Service -> Controller)
export class UpdateReformerProfileResponseDto {
  public readonly reformerId: string;
  public readonly nickname: string;
  public readonly bio: string;
  public readonly keywords: string[];
  public readonly profileImageUrl: string;

  constructor( props: Partial<owner>) {
    this.reformerId = props.owner_id!;
    this.nickname = props.nickname!;
    this.bio = props.bio ?? '';
    this.keywords = props.keywords ?? [];
    this.profileImageUrl = props.profile_photo ?? '';
  }
}

// 유저 프로필 업데이트 응답 데이터 (Service -> Controller)
export class UpdateUserProfileResponseDto {
  public readonly userId: string;
  public readonly nickname: string;
  public readonly name: string;
  public readonly phone: string;
  public readonly email: string;
  public readonly profileImageUrl: string;

  constructor( props: Partial<user>) {
    this.userId = props.user_id!;
    this.nickname = props.nickname!;
    this.name = props.name!;
    this.phone = props.phone!;
    this.email = props.email!;
    this.profileImageUrl = props.profile_photo ?? '';
  }
}

// 유저 상세 정보 응답 데이터 (Service -> Controller)
export class UserDetailInfoResponseDto {
  public readonly userId: string;
  public readonly role: Role;
  public readonly email: string;
  public readonly name: string;
  public readonly nickname: string;
  public readonly phone: string;
  public readonly profileImageUrl: string;

  constructor( props: Partial<user>) {
    this.userId = props.user_id!;
    this.role = 'user';
    this.email = props.email!;
    this.name = props.name!;
    this.nickname = props.nickname!;
    this.phone = props.phone!;
    this.profileImageUrl = props.profile_photo ?? '';
  }
}

// 리폼러 상세 정보 응답 데이터 (Service -> Controller)
export class ReformerDetailInfoResponseDto {
  public readonly reformerId: string;
  public readonly role: Role;
  public readonly authStatus: AuthStatus;
  public readonly email: string;
  public readonly name: string;
  public readonly nickname: string;
  public readonly phone: string;
  public readonly profileImageUrl: string;
  public readonly keywords: string[];
  public readonly bio: string;
  public readonly averageRating: number;
  public readonly reviewCount: number;
  public readonly totalSales: number;

  constructor( props: Partial<owner>) {
    this.reformerId = props.owner_id!;
    this.role = 'reformer';
    this.authStatus = props.status!;
    this.email = props.email!;
    this.name = props.name!;
    this.nickname = props.nickname!;
    this.phone = props.phone!;
    this.profileImageUrl = props.profile_photo ?? '';
    this.keywords = props.keywords ?? [];
    this.bio = props.bio ?? '';
    this.averageRating = props.avg_star?.toNumber() ?? 0;
    this.reviewCount = props.review_count ?? 0;
    this.totalSales = props.trade_count ?? 0;
  }
}
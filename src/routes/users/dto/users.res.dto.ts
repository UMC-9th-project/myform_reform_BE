import { AuthStatus, Role } from '../../auth/dto/auth.dto.js';
import { owner, user, reformer_status_enum } from '@prisma/client';
import { rawReformerPortfolio } from '../users.model.js';

// 닉네임 중복 검사 응답 데이터
export class CheckNicknameResponseDto {
  isAvailable: boolean;
  nickname: string;
  message: string;

  constructor(
    isAvailable: boolean,
    nickname: string,
    message: string
  ){
    this.isAvailable = isAvailable,
    this.nickname = nickname,
    this.message = message
  }
}

// 유저 정보 응답 데이터
export class UsersInfoResponseDto {
  id: string;
  email: string;
  nickname: string;
  hashed?: string;
  role: Role;
  auth_status?: reformer_status_enum;

  constructor(
    id: string,
    email: string,
    nickname: string,
    role: Role,
    hashed?: string,
    auth_status?: reformer_status_enum,
  ) {
    this.id = id,
    this.email = email,
    this.nickname = nickname,
    this.hashed = hashed,
    this.role = role,
    this.auth_status = auth_status
  }
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

export interface UserProfileResponseDto{
  userId: string,
  email: string,
  name: string,
  nickName: string,
  phone: string,
  profilePhoto: string,
  role: Role
}

export class ReformerPortfolioDto {
  owner_id: string;
  name: string | null;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  introduction: string | null;
  photos: string[] | null;
  business_number: string | null;
  SubmissionDate: Date | null;
  status: reformer_status_enum;

  constructor(data: {
    owner_id: string;
    name: string | null;
    nickname: string | null;
    email: string | null;
    phone: string | null;
    portfolio: string | null;
    photos: string[] | null;
    business_number: string | null;
    status: reformer_status_enum;
    created_at: Date | null;
  }) {
    this.owner_id = data.owner_id;
    this.name = data.name;
    this.nickname = data.nickname;
    this.email = data.email;
    this.phone = data.phone;
    this.introduction = data.portfolio;
    this.photos = data.photos;
    this.business_number = data.business_number;
    this.status = data.status;
    this.SubmissionDate = data.created_at;
  }

  static fromRaw(raw: rawReformerPortfolio): ReformerPortfolioDto {
    const auth = raw.reformer_auth?.[0];

    return new ReformerPortfolioDto({
      owner_id: raw.owner_id,
      name: raw.name,
      nickname: raw.nickname,
      email: raw.email,
      phone: raw.phone,
      status: raw.status,
      created_at: raw.created_at,
      portfolio: auth?.portfolio ?? null,
      photos: auth?.photo ?? [],
      business_number: auth?.business_number ?? null,
    });
  }
}
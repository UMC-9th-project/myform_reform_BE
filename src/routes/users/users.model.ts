import { UserProfileResponseDto } from './dto/users.res.dto.js';
import { Prisma } from '@prisma/client';

export type RawUserPorfile = Prisma.userGetPayload<{
  select: {
    user_id: true,
    email: true,
    name: true,
    nickname: true,
    phone: true,
    profile_photo: true
  }
}>

export class UserProfile {
  private props: UserProfileResponseDto

  private constructor(props: UserProfileResponseDto) {
    this.props = props;
  }

  static create(raw: RawUserPorfile): UserProfile {
    return new UserProfile({
      userId: raw.user_id,
      email: raw.email ?? '',
      name: raw.name ?? '',
      nickName: raw.nickname ?? '',
      phone: raw.phone ?? '',
      profilePhoto: raw.profile_photo ?? '',
      role: 'user'
    })
  }
  
  toDto() {
    return { ...this.props };
  }
}

export type rawReformerPortfolio = Prisma.ownerGetPayload<{
  select: {
    owner_id: true,
    status: true,
    email: true,
    name: true,
    nickname: true,
    phone: true,
    created_at: true,
    reformer_auth: {
      select: {
        portfolio: true,
        photo: true,
        business_number: true
      }
    }
  }  
}>
import { processKeywords, validateBio, validateEmail, validateNickname, validatePhoneNumber } from '../../../utils/validators.js';
import { AuthStatus } from '../../auth/auth.dto.js';

// 리폼러 상태 업데이트 요청 데이터 (Controller -> Service)
export interface UpdateReformerStatusRequest {
  status: AuthStatus;
}

export class UpdateUserProfileRequestDto {
  /**
   * @example "새닉네임"
   */
  nickname?: string;

  /**
   * @example "01012345678"
   */
  phone?: string;

  /**
   * @example "new_email@example.com"
   */
  email?: string;
  /**
   * @example "https://example.com/image.jpg"
   */
  profileImageUrl?: string;

  constructor(props?: Partial<UpdateUserProfileRequestDto>) {
    if (props) {
      this.nickname = props.nickname;
      this.phone = props.phone;
      this.email = props.email;
      this.profileImageUrl = props.profileImageUrl;
    }
  }
}

export class UpdateUserProfileParams {
  public readonly userId: string;
  public readonly nickname?: string;
  public readonly phone?: string;
  public readonly email?: string;
  public readonly profileImageUrl?: string;

  constructor(props: { userId: string } & Partial<UpdateUserProfileRequestDto>) {
    this.userId = props.userId;
    this.nickname = props.nickname;
    this.phone = props.phone;
    this.email = props.email;
    this.profileImageUrl = props.profileImageUrl;
    
    if (this.nickname !== undefined) {
      validateNickname(this.nickname);
    }
    if (this.phone !== undefined) {
      validatePhoneNumber(this.phone);
    }
    if (this.email !== undefined) {
      validateEmail(this.email);
    }
  }

  toPrismaUpdateData(){
    return {
      nickname: this.nickname,
      phone: this.phone,
      email: this.email,
      profile_photo: this.profileImageUrl,
    };
  }
}

// 리폼러 프로필 업데이트 요청 데이터 (Controller -> Service)

export class UpdateReformerProfileRequestDto {
  /**
   * @example "https://example.com/image.jpg"
   */
  profileImageUrl?: string;

  /**
   * @example "새닉네임"
   */
  nickname?: string;

  /**
   * @example "new_bio"
   */
  bio?: string;

  /**
   * @example ["keyword1", "keyword2"]
   */
  keywords?: string[];

  constructor(props?: Partial<UpdateReformerProfileRequestDto>) {
    if (props) {
      this.profileImageUrl = props.profileImageUrl;
      this.nickname = props.nickname;
      this.bio = props.bio;
      this.keywords = props.keywords;
    }
  }
}


export class UpdateReformerProfileParams {
  public readonly reformerId: string;
  public readonly nickname?: string;
  public readonly bio?: string;
  public readonly keywords?: string[];
  public readonly profileImageUrl?: string;

  constructor(props: { reformerId: string } & Partial<UpdateReformerProfileRequestDto>) {
    this.reformerId = props.reformerId;
    this.nickname = props.nickname;
    this.bio = props.bio;
    this.keywords = props.keywords;
    this.profileImageUrl = props.profileImageUrl;
    if (this.nickname !== undefined) {
      validateNickname(this.nickname);
    }
    if (this.bio !== undefined) {
      validateBio(this.bio)
    }
    if (this.keywords !== undefined) {
      this.keywords = processKeywords(this.keywords);
    }
  }

  toPrismaUpdateData(){
    return {
      profile_photo: this.profileImageUrl,
      nickname: this.nickname,
      bio: this.bio,
      keywords: this.keywords,
    };
  }
}


//  배송지 데이터
export class AddAddressRequestDto {
  /**
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  postalCode!: string;
  /**
   * @example "서울특별시 종로구 사직로 100"
   */
  address!: string;
  /**
   * @example "101동 101호"
   */
  detailAddress?: string | null;
  /**
   * @example true
   * @default false
   */
  isDefault?: boolean;

  /**
   * @example "우리 집"
   */
  addressName?: string;

  /**
   * @example "홍길동"
   */
  recipient!: string;
  /**
   * @example "01012345678"
   */
  phone!: string;

  constructor(props?: Partial<AddAddressRequestDto>) {
    if (props) {
      this.postalCode = props.postalCode!;
      this.address = props.address!;
      this.detailAddress = props.detailAddress;
      this.isDefault = props.isDefault ?? false;
      this.addressName = props.addressName;
      this.recipient = props.recipient!;
      this.phone = props.phone!;
    }
  }
}

export class AddAddressParamsDto {
  public readonly id!: string;
  public readonly postalCode: string;
  public readonly address: string;
  public readonly detailAddress?: string | null;
  public readonly isDefault?: boolean;
  public readonly addressName?: string;
  public readonly recipient!: string;
  public readonly phone!: string;
  constructor(props: { id: string, postalCode: string, address: string, detailAddress?: string, isDefault?: boolean, addressName?: string, recipient: string, phone: string }) {
    this.id = props.id;
    this.postalCode = props.postalCode;
    this.address = props.address;
    this.detailAddress = props.detailAddress;
    this.isDefault = props.isDefault;
    this.addressName = props.addressName;
    this.recipient = props.recipient;
    this.phone = props.phone;
  }
}
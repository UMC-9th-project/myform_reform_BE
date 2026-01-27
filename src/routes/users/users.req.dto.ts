import { AuthStatus } from '../auth/auth.dto.js';

// 리폼러 상태 업데이트 요청 데이터 (Controller -> Service)
export interface UpdateReformerStatusRequest {
  status: AuthStatus;
}

export interface UserProfile {
  userId: string;
  nickname?: string;
  phone?: string;
  email?: string;
}

// 유저 프로필 업데이트 요청 데이터 (Controller -> Service)
export type UpdateUserProfileRequest = Partial<Omit<UserProfile, 'userId'>>;

// 유저 프로필 업데이트 요청 (Service -> Repository)
export interface UpdateUserProfileParams extends UserProfile {}

export interface UserImage {
  userId: string;
  profileImage: Express.Multer.File;
}

// 유저 프로필 사진 업데이트 요청 (Service -> Repository)
export interface UpdateUserImageParams {
  userId: string;
  profileUrl: string;
}

// 리폼러 프로필 데이터
export interface ReformerProfile {
  reformerId: string;
  nickname?: string;
  bio?: string;
  keywords?: string[];
}

// 리폼러 프로필 업데이트 요청 데이터 (Controller -> Service)
export type UpdateReformerProfileRequest = Partial<Omit<ReformerProfile, 'reformerId'>>;

// 리폼러 프로필 업데이트 요청 (Service -> Repository)
export interface UpdateReformerProfileParams extends UpdateReformerProfileRequest {}

// 배송지 데이터
export interface Address {
  deliveryAddressId: string;
  userId: string;
  postalCode: string;
  address: string;
  detailAddress: string | null;
  isDefault: boolean;
}

// 배송지 추가 요청 데이터 (Controller -> Service)
export type AddAddressRequest = Omit<Address, 'userId'>;

// 배송지 추가 요청 (Service -> Repository)
export interface AddAddressParams extends AddAddressRequest {}

// 배송지 추가 결과 데이터 (Repository -> Service)
export interface AddAddressResult extends Address {}

// 배송지 업데이트 요청 데이터 (Controller -> Service)
export type UpdateAddressRequest = Partial<Omit<Address, 'userId'>>;

// 배송지 업데이트 요청 (Service -> Repository)
export interface UpdateAddressParams extends UpdateAddressRequest {}

// 배송지 업데이트 결과 데이터 (Repository -> Service)
export interface UpdateAddressResult extends Address {}

// 배송지 삭제 요청 데이터 deliveryAddressId 만 필요 (Controller -> Service)
export type DeleteAddressRequest = Pick<Address, 'deliveryAddressId'>;

// 배송지 삭제 요청 (Service -> Repository)
export interface DeleteAddressParams {
  deliveryAddressId: string;
  userId: string;
}

// 배송지 삭제 결과 데이터 (Repository -> Service)
export interface DeleteAddressResult {
  deliveryAddressId: string;
}
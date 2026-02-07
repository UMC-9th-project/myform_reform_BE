import { UUID } from '../../../@types/common.js';

export interface ReformHomeResponse {
  requests: ReformRequestResponseDto[];
  proposals: ReformProposalResponseDto[];
}

export interface ReformProposalResponseDto {
  reformProposalId: UUID;
  isWished: boolean;
  thumbnail: string;
  title: string;
  price: number;
  avgStar: number;
  reviewCount: number;
  ownerName: string;
}

export interface ReformRequestResponseDto {
  reformRequestId: UUID;
  thumbnail: string;
  title: string;
  minBudget: number;
  maxBudget: number;
}

export interface ReformDetailRequestResponseDto {
  reformRequestId: UUID;
  title: string;
  minBudget: number;
  maxBudget: number;
  isOwner: boolean;
  images: {
    photo: string;
    photo_order: number;
  }[];
  content: string;
  dueDate: Date;
  name: string;
  profile: string;
}

export interface ReformDetailProposalResponseDto {
  reformProposalId: UUID;
  isOwner: boolean;
  isWished: boolean;
  ownerId: UUID;
  title: string;
  price: number;
  delivery: number;
  expectedWorking: number;
  images: {
    photo: string;
    photo_order: number;
  }[];
  content: string;
  profile: {
    ownerName: string;
    ownerProfile: string;
    avgStar: number;
    reviewCount: number;
    toatalSaleCount: number;
    keywords: string[];
    bio: string;
  };
}

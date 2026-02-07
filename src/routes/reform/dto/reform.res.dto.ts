import { UUID } from '../../../@types/common.js';

export interface ReformHomeResponse {
  requests: ReformRequestResponseDto[];
  proposals: ReformProposalResponseDto[];
}

export interface ReformProposalResponseDto {
  reformProposalId: UUID;
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
  title: string;
  price: number;
  delivery: number;
  expectedWorking: number;
  isOwner: boolean;
  images: {
    photo: string;
    photo_order: number;
  }[];
  content: string;
  ownerName: string;
  ownerProfile: string;
}

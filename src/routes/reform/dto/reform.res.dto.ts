import { UUID } from '../../../@types/common.js';
import { Category } from '../../../@types/item.js';

export class ReformHomeResponse {
  requests!: ReformRequestResponseDto[];
  proposals!: ReformProposalResponseDto[];
}

export class ReformProposalResponseDto {
  reformProposalId!: UUID;
  isWished!: boolean;
  thumbnail!: string;
  title!: string;
  price!: number;
  avgStar!: number;
  reviewCount!: number;
  ownerName!: string;
  isCompleted?: boolean;
}

export class ReformRequestResponseDto {
  reformRequestId!: UUID;
  thumbnail!: string;
  isWished!: boolean;
  title!: string;
  minBudget!: number;
  maxBudget!: number;
  isCompleted?: boolean;
}

export class ReformDetailRequestResponseDto {
  reformRequestId!: UUID;
  title!: string;
  minBudget!: number;
  maxBudget!: number;
  isOwner!: boolean;
  images!: {
    photo: string;
    photo_order: number;
  }[];
  content!: string;
  category!: Category;
  dueDate!: Date;
  nickname!: string;
  profile!: string;
  isCompleted?: boolean;
}

export class ReformDetailProposalResponseDto {
  reformProposalId!: UUID;
  isOwner!: boolean;
  isWished!: boolean;
  ownerId!: UUID;
  title!: string;
  price!: number;
  delivery!: number;
  expectedWorking!: number;
  category!: Category;
  images!: {
    photo: string;
    photo_order: number;
  }[];
  content!: string;
  profile!: {
    ownerName: string;
    ownerProfile: string;
    avgStar: number;
    avgStarRecent3m: number;
    reviewCount: number;
    toatalSaleCount: number;
    keywords: string[];
    bio: string;
  };
  isCompleted?: boolean;
}

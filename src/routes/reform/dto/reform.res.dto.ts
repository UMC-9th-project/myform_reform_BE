import { UUID } from '../../../@types/common.js';

// type ProposalItem = Prisma.reform_proposalGetPayload<{
//   select: {
//     title: true;
//     price: true;
//     avg_star: true;
//     review_count: true;
//     reform_proposal_photo: {
//       select: {
//         content: true;
//       };
//     };
//     owner: {
//       select: { name: true };
//     };
//   };
// }>;

// type ReformRequest = Prisma.reform_requestGetPayload<{
//   select: {
//     title: true;
//     min_budget: true;
//     max_budget: true;
//     reform_request_photo: {
//       select: {
//         content: true;
//       };
//     };
//   };
// }>;

// type ReformRequestListResDto = Prisma.reform_requestGetPayload<{
//   select: {
//     min_budget: true;
//     max_budget: true;
//     title: true;
//     reform_request_photo: {
//       take: 1;
//       select: {
//         content: true;
//       };
//     };
//   };
// }>;

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

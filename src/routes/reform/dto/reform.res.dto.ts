import { Prisma } from '@prisma/client';

type ProposalItem = Prisma.reform_proposalGetPayload<{
  select: {
    title: true;
    price: true;
    avg_star: true;
    review_count: true;
    reform_proposal_photo: {
      select: {
        content: true;
      };
    };
    owner: {
      select: { name: true };
    };
  };
}>;

type RequestItem = Prisma.reform_requestGetPayload<{
  select: {
    title: true;
    min_budget: true;
    max_budget: true;
    reform_request_photo: {
      select: {
        content: true;
      };
    };
  };
}>;

export interface ReformHomeResponse {
  requests: RequestItemDto[];
  proposals: ProposalItemDto[];
}

export class ProposalItemDto {
  thumbnail!: string;
  title!: string;
  price!: number;
  avgStar!: number;
  reviewCount!: number;
  ownerName!: string;

  constructor(body: ProposalItem) {
    this.thumbnail = body.reform_proposal_photo[0]?.content ?? '';
    this.title = body.title ?? '';
    this.price = body.price?.toNumber() ?? 0;
    this.avgStar = body.avg_star?.toNumber() ?? 0;
    this.reviewCount = body.review_count ?? 0;
    this.ownerName = body.owner.name ?? '';
  }
}

export class RequestItemDto {
  thumbnail: string;
  title: string;
  minBudget: number;
  maxBudget: number;

  constructor(body: RequestItem) {
    this.thumbnail = body.reform_request_photo[0]?.content ?? '';
    this.title = body.title ?? '';
    this.minBudget = body.min_budget?.toNumber() ?? 0;
    this.maxBudget = body.max_budget?.toNumber() ?? 0;
  }
}

import { Prisma } from '@prisma/client';
import {
  ReformProposalResponseDto,
  ReformRequestResponseDto
} from './dto/reform.res.dto.js';
import { ReformRequestRequest } from './dto/reform.req.dto.js';
import { Category } from '../../@types/item.js';
import { ImageUrls } from '../common/upload.dto.js';

export interface ReformRequestCreateData {
  userId: string;
  images: string[];
  contents: string;
  minBudget: number;
  maxBudget: number;
  dueDate: Date;
  category: Category;
  title: string;
}

export type RawRequestLatest = Prisma.reform_requestGetPayload<{
  select: {
    reform_request_id: true;
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

export type RawProposalLatest = Prisma.reform_proposalGetPayload<{
  select: {
    reform_proposal_id: true;
    title: true;
    price: true;
    avg_star: true;
    review_count: true;
    reform_proposal_photo: {
      take: 1;
      select: {
        content: true;
      };
      orderBy: {
        photo_order: { sort: 'asc' };
      };
    };
    owner: {
      select: { name: true };
    };
  };
}>;

export class ReformRequest {
  private responseProps?: ReformRequestResponseDto;
  private createData?: ReformRequestCreateData;

  private constructor(
    response?: ReformRequestResponseDto,
    create?: ReformRequestCreateData
  ) {
    this.responseProps = response;
    this.createData = create;
  }

  // 조회용: DB 결과 -> 응답 DTO
  static fromRaw(raw: RawRequestLatest) {
    return new ReformRequest(
      {
        reformRequestId: raw.reform_request_id,
        thumbnail: raw.reform_request_photo[0]?.content ?? '',
        title: raw.title ?? '',
        minBudget: raw.min_budget?.toNumber() ?? 0,
        maxBudget: raw.max_budget?.toNumber() ?? 0
      },
      undefined
    );
  }

  // 생성용: 요청 DTO -> 저장용 데이터
  static fromRequest(req: ReformRequestRequest, userId: string) {
    return new ReformRequest(undefined, {
      userId,
      images: req.images,
      contents: req.contents,
      minBudget: req.minBudget,
      maxBudget: req.maxBudget,
      dueDate: req.dueDate,
      category: req.category,
      title: req.title
    });
  }

  // 응답용 DTO 반환
  toDto(): ReformRequestResponseDto {
    if (!this.responseProps) {
      throw new Error('This ReformRequest instance is not for response');
    }
    return { ...this.responseProps };
  }

  // DB 저장용 데이터 반환
  toCreateData(): ReformRequestCreateData {
    if (!this.createData) {
      throw new Error('This ReformRequest instance is not for creation');
    }
    return { ...this.createData };
  }
}
export class ReformProposal {
  private props: ReformProposalResponseDto;
  private constructor(props: ReformProposalResponseDto) {
    this.props = props;
  }

  static create(raw: RawProposalLatest) {
    return new ReformProposal({
      reformProposalId: raw.reform_proposal_id,
      thumbnail: raw.reform_proposal_photo[0]?.content ?? '',
      title: raw.title ?? '',
      price: raw.price?.toNumber() ?? 0,
      avgStar: raw.avg_star?.toNumber() ?? 0,
      reviewCount: raw.review_count ?? 0,
      ownerName: raw.owner.name ?? ''
    });
  }
  toDto() {
    return { ...this.props };
  }
}

import { Prisma } from '@prisma/client';
import {
  ReformDetailProposalResponseDto,
  ReformDetailRequestResponseDto,
  ReformProposalResponseDto,
  ReformRequestResponseDto
} from './dto/reform.res.dto.js';
import {
  ModifyProposalRequest,
  ModifyRequestRequest,
  ReformProposalRequest,
  ReformRequestRequest
} from './dto/reform.req.dto.js';
import { Category } from '../../@types/item.js';

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

export interface ReformRequestUpdateData {
  requestId: string;
  userId: string;
  images?: string[];
  contents?: string;
  minBudget?: number;
  maxBudget?: number;
  dueDate?: Date;
  category?: Category;
  title?: string;
}

export interface ReformProposalCreateData {
  ownerId: string;
  images: string[];
  contents: string;
  price: number;
  delivery: number;
  expectedWorking: number;
  category: Category;
  title: string;
}

export interface ReformProposalUpdateData {
  proposalId: string;
  ownerId: string;
  images?: string[];
  contents?: string;
  price?: number;
  delivery?: number;
  expectedWorking?: number;
  category?: Category;
  title?: string;
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

export type RawRequestDetail = Prisma.reform_requestGetPayload<{
  select: {
    title: true;
    max_budget: true;
    min_budget: true;
    content: true;
    due_date: true;
    reform_request_id: true;
    user: {
      select: {
        name: true;
        profile_photo: true;
      };
    };
  };
}>;

export type RawRequestDetailImages = Prisma.reform_request_photoGetPayload<{
  select: { content: true; photo_order: true };
}>;

export type RawProposalDetail = Prisma.reform_proposalGetPayload<{
  select: {
    reform_proposal_id: true;
    title: true;
    content: true;
    price: true;
    delivery: true;
    expected_working: true;
    owner: {
      select: {
        name: true;
        profile_photo: true;
      };
    };
  };
}>;

export type RawProposalDetailImages = Prisma.reform_proposal_photoGetPayload<{
  select: { content: true; photo_order: true };
}>;

// 조회용 응답 클래스
export class ReformRequestResponse {
  private readonly props: ReformRequestResponseDto;
  constructor(props: ReformRequestResponseDto) {
    this.props = props;
  }

  toDto(): ReformRequestResponseDto {
    return { ...this.props };
  }
}

export class ReformDetailRequestResponse {
  private readonly props: ReformDetailRequestResponseDto;
  constructor(props: ReformDetailRequestResponseDto) {
    this.props = props;
  }

  toDto(): ReformDetailRequestResponseDto {
    return { ...this.props };
  }
}

export class ReformDetailProposalResponse {
  private readonly props: ReformDetailProposalResponseDto;
  constructor(props: ReformDetailProposalResponseDto) {
    this.props = props;
  }

  toDto(): ReformDetailProposalResponseDto {
    return { ...this.props };
  }
}

// 생성용 클래스
export class ReformRequestCreate {
  private readonly data: ReformRequestCreateData;

  constructor(data: ReformRequestCreateData) {
    this.data = data;
  }

  toCreateData(): ReformRequestCreateData {
    return { ...this.data };
  }
}

// 수정용 클래스
export class ReformRequestUpdate {
  private readonly data: ReformRequestUpdateData;

  constructor(data: ReformRequestUpdateData) {
    this.data = data;
  }

  toUpdateData(): ReformRequestUpdateData {
    return { ...this.data };
  }
}

// 팩토리 클래스
export class ReformRequestFactory {
  // 조회용: DB 결과 -> 응답 객체
  static createFromRaw(raw: RawRequestLatest): ReformRequestResponse {
    return new ReformRequestResponse({
      reformRequestId: raw.reform_request_id,
      thumbnail: raw.reform_request_photo[0]?.content ?? '',
      title: raw.title ?? '',
      minBudget: raw.min_budget?.toNumber() ?? 0,
      maxBudget: raw.max_budget?.toNumber() ?? 0
    });
  }

  static createFromDetailRaw(
    rawBody: RawRequestDetail,
    rawPhoto: RawRequestDetailImages[],
    isOwner: boolean
  ): ReformDetailRequestResponse {
    return new ReformDetailRequestResponse({
      isOwner: isOwner,
      reformRequestId: rawBody.reform_request_id,
      dueDate: rawBody.due_date!,
      title: rawBody.title ?? '',
      content: rawBody.content ?? '',
      minBudget: rawBody.min_budget?.toNumber() ?? 0,
      maxBudget: rawBody.max_budget?.toNumber() ?? 0,
      name: rawBody.user.name ?? '',
      profile: rawBody.user.profile_photo ?? '',
      images: rawPhoto.map((props) => {
        return {
          photo: props.content ?? '',
          photo_order: props.photo_order ?? 0
        };
      })
    });
  }

  // 생성용: 요청 DTO -> 저장용 객체
  static createFromRequest(
    req: ReformRequestRequest,
    userId: string
  ): ReformRequestCreate {
    return new ReformRequestCreate({
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

  // 수정용: 요청 DTO -> 수정용 객체
  static createFromModifyRequest(
    req: ModifyRequestRequest,
    requestId: string,
    userId: string
  ): ReformRequestUpdate {
    return new ReformRequestUpdate({
      requestId,
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
}
// 제안서 응답 클래스
export class ReformProposalResponse {
  private readonly props: ReformProposalResponseDto;

  constructor(props: ReformProposalResponseDto) {
    this.props = props;
  }

  toDto(): ReformProposalResponseDto {
    return { ...this.props };
  }
}

// 제안서 생성용 클래스
export class ReformProposalCreate {
  private readonly data: ReformProposalCreateData;

  constructor(data: ReformProposalCreateData) {
    this.data = data;
  }

  toCreateData(): ReformProposalCreateData {
    return { ...this.data };
  }
}

// 제안서 수정용 클래스
export class ReformProposalUpdate {
  private readonly data: ReformProposalUpdateData;

  constructor(data: ReformProposalUpdateData) {
    this.data = data;
  }

  toUpdateData(): ReformProposalUpdateData {
    return { ...this.data };
  }
}

// 제안서 팩토리 클래스
export class ReformProposalFactory {
  static createFromRaw(raw: RawProposalLatest): ReformProposalResponse {
    return new ReformProposalResponse({
      reformProposalId: raw.reform_proposal_id,
      thumbnail: raw.reform_proposal_photo[0]?.content ?? '',
      title: raw.title ?? '',
      price: raw.price?.toNumber() ?? 0,
      avgStar: raw.avg_star?.toNumber() ?? 0,
      reviewCount: raw.review_count ?? 0,
      ownerName: raw.owner.name ?? ''
    });
  }

  static createFromDetailRaw(
    rawBody: RawProposalDetail,
    rawPhoto: RawProposalDetailImages[],
    isOwner: boolean
  ): ReformDetailProposalResponse {
    return new ReformDetailProposalResponse({
      isOwner: isOwner,
      reformProposalId: rawBody.reform_proposal_id,
      title: rawBody.title ?? '',
      content: rawBody.content ?? '',
      price: rawBody.price?.toNumber() ?? 0,
      delivery: rawBody.delivery?.toNumber() ?? 0,
      expectedWorking: rawBody.expected_working?.toNumber() ?? 0,
      ownerName: rawBody.owner.name ?? '',
      ownerProfile: rawBody.owner.profile_photo ?? '',
      images: rawPhoto.map((props) => {
        return {
          photo: props.content ?? '',
          photo_order: props.photo_order ?? 0
        };
      })
    });
  }

  static createFromRequest(
    req: ReformProposalRequest,
    ownerId: string
  ): ReformProposalCreate {
    return new ReformProposalCreate({
      ownerId,
      images: req.images,
      contents: req.contents,
      price: req.price,
      delivery: req.delivery,
      expectedWorking: req.expectedWorking,
      category: req.category,
      title: req.title
    });
  }

  static createFromModifyRequest(
    req: ModifyProposalRequest,
    proposalId: string,
    ownerId: string
  ): ReformProposalUpdate {
    return new ReformProposalUpdate({
      proposalId,
      ownerId,
      images: req.images,
      contents: req.contents,
      price: req.price,
      delivery: req.delivery,
      expectedWorking: req.expectedWorking,
      category: req.category,
      title: req.title
    });
  }
}

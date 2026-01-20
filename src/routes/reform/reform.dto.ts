import {
  $Enums,
  order_status_enum,
  reform_proposal,
  reform_proposal_photo,
  reform_request,
  reform_request_photo,
  target_type_enum
} from '@prisma/client';
import { Category } from '../../types/item.js';
import { Reform } from '../profile/profile.dto.js';
import { AddQuoteReq, ReformRequestReq } from './dto/reform.req.dto.js';

export interface RequestItems {
  thumbnail: string;
  title: string;
  price: string;
  reformer: string;
}

export class ReformRequestDto {
  userId: string;
  images: {
    content: string;
    photo_order: number;
  }[];
  contents: string;
  minBudget: number;
  maxBudget: number;
  dueDate: Date;
  category: Category;
  title: string;
  constructor(body: ReformRequestReq) {
    this.userId = '';
    this.images = [];
    this.contents = body.contents;
    this.minBudget = body.minBudget;
    this.maxBudget = body.maxBudget;
    this.dueDate = body.dueDate;
    this.title = body.title;
    this.category = body.category;
  }
}

export interface RequestDetail {
  userId: string;
  images: {
    content: string;
    photo_order: number;
  }[];
  contents: string | null;
  title: string | null;

  min_budget: number;
  max_budget: number;
  due_date: Date | null;
  created_at: Date | null;
}

export class RequestDetailDto implements RequestDetail {
  userId: string;
  images: {
    content: string;
    photo_order: number;
  }[];
  contents: string | null;
  title: string | null;

  min_budget: number;
  max_budget: number;
  due_date: Date | null;
  created_at: Date | null;

  constructor(body: reform_request, images: reform_request_photo[]) {
    this.userId = body.user_id;
    this.contents = body.content;
    this.title = body.title;
    this.min_budget = body.min_budget!.toNumber();
    this.max_budget = body.max_budget!.toNumber();
    this.due_date = body.due_date;
    this.created_at = body.created_at;
    this.images = [];
    this.extractImg(images);
  }

  extractImg(images: reform_request_photo[]) {
    const image = images;
    for (const img of image) {
      const obj = {
        content: img.content!,
        photo_order: img.photo_order!
      };
      this.images.push(obj);
    }
  }
}

export type ProposalDetail = Partial<Reform> & {
  ownerId: string;
};

//FIXME : 타입이 너무 중구난방이라 추후 리팩터링 해야함
export class ProposalDetailDto implements ProposalDetail {
  ownerId: string;
  images: {
    content: string;
    photo_order: number;
  }[];
  title: string;
  content: string;
  price: number;
  delivery: number;
  expected_working: number;

  constructor(body: reform_proposal, images: reform_proposal_photo[]) {
    this.ownerId = body.owner_id;
    //TODO: null인 타입 수정하기
    this.title = body.title!;
    this.content = body.content!;
    //TODO: DB에 numeric을 interger로 바꿔야할듯
    this.price = body.price!.toNumber();
    this.delivery = body.delivery!.toNumber();
    this.expected_working = body.expected_working!.toNumber();
    this.images = [];
    this.extractImg(images);
  }
  extractImg(images: reform_proposal_photo[]) {
    const image = images;
    for (const img of image) {
      const obj = {
        content: img.content!,
        photo_order: img.photo_order!
      };
      this.images.push(obj);
    }
  }
}

export interface Order {
  images: {
    content: string;
    photo_order: number;
  }[];
  price: number;
  delivery: number;
  content: string;
  expected_working: number;
  status: order_status_enum;
  // userAddress: string;
  // reformerAddress: string;
  targetId: string | null;
  type: target_type_enum;
  amount: number;
}

export class OrderQuoteDto {
  images: { content: string; photo_order: number }[];
  price: number;
  delivery: number;
  content: string;
  expected_working: number;
  status: $Enums.order_status_enum;
  type: $Enums.target_type_enum;
  targetId: string;
  amount: number;

  ownerId: string;
  userId: string;
  constructor(body: AddQuoteReq, ownerId: string) {
    this.ownerId = ownerId;
    this.userId = body.userId;
    this.targetId = body.reform_request_id;
    this.price = body.price;
    this.delivery = body.delivery;
    this.content = body.content;
    this.expected_working = body.expected_working;

    this.images = [];
    this.amount = 1;
    this.status = order_status_enum.PENDING;
    this.type = target_type_enum.REQUEST;
  }
}

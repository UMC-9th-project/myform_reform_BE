import { Category } from '../../../types/item.js';

export interface AddQuoteReq {
  userId: string;
  reform_request_id: string;
  price: number;
  delivery: number;
  content: string;
  expected_working: number;
}

export interface ReformRequestReq {
  images: {
    content: string;
    photo_order: number;
  }[];
  title: string;
  contents: string;
  minBudget: number;
  maxBudget: number;
  dueDate: Date;
  category: Category;
}

export class RequestFilterDto {
  sortBy: 'RECENT' | 'POPULAR' = 'RECENT';
  page: number = 1;
  limit: number = 15;
  category: Category;

  constructor(
    sortBy: 'RECENT' | 'POPULAR',
    page: number,
    limit: number,
    category?: string,
    subcategory?: string
  ) {
    this.sortBy = sortBy;
    this.page = page;
    this.limit = limit;
    this.category = {
      major: category ?? '',
      sub: subcategory ?? ''
    };
  }
}

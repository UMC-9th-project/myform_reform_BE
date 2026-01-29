import { Category } from '../../@types/item.js';

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

import { Category } from '../../types/item.js';

export interface RequestItems {
  thumbnail: string;
  title: string;
  price: string;
  reformer: string;
}

export interface ReformRequest {
  images: string[];
  title: string;
  contents: string;
  minBudget: number;
  maxBudget: number;
  dueDate: Date;
  category: Category;
}

export class ReformRequestDto implements ReformRequest {
  userId: string;
  images: string[];
  contents: string;
  minBudget: number;
  maxBudget: number;
  dueDate: Date;
  category: Category;
  title: string;
  constructor(body: ReformRequest) {
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

import { order_status_enum } from '@prisma/client';
import { Category, OptionGroup } from '../../../types/item.js';
import { UUID } from 'aws-sdk/clients/cloudtrail.js';
// import { UUID } from '../.../../types/common.js';
// import { Category, Option, OptionGroup } from '../../types/item.js';

interface Item {
  images: {
    content: string;
    photo_order: number;
  }[];
  title: string;
  content: string;
  price: number;
  delivery: number;
  option: OptionGroup[];
  category: Category;
}

export type ItemRequest = Omit<Item, 'images'>;

export class ItemDto implements Item {
  ownerId: string;
  images: {
    content: string;
    photo_order: number;
  }[];
  title: string;
  content: string;
  price: number;
  delivery: number;
  option: OptionGroup[];
  category: Category;

  constructor(body: ItemRequest, ownerId: string) {
    this.ownerId = ownerId;
    this.images = [];
    this.title = body.title;
    this.content = body.content;
    this.price = body.price;
    this.delivery = body.delivery;
    this.option = body.option;
    this.category = body.category;
  }
}

export interface Reform {
  images: {
    content: string;
    photo_order: number;
  }[];
  title: string;
  content: string;
  price: number;
  delivery: number;
  expected_working: number;
  category: Category;
}

export type ReformRequest = Omit<Reform, 'images'>;

export class ReformDto implements Reform {
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
  category: Category;

  constructor(body: ReformRequest, ownerId: string) {
    this.ownerId = ownerId;
    this.images = [];
    this.title = body.title;
    this.content = body.content;
    this.price = body.price;
    this.expected_working = body.expected_working;
    this.delivery = body.delivery;
    this.category = body.category;
  }
}

export interface SalesManagement {
  thumnails: string;
  orderId: UUID;
  type: 'ITEM' | 'REFORM';
  title: string;
  price: number;
  buyer: string;
  paymentDay: Date;
  status: order_status_enum;
}

import { Category, Option, OptionGroup } from '../../types/item.js';

interface Item {
  images: string[];
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
  images: string[];
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

interface Reform {
  images: string[];
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
  images: string[];
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

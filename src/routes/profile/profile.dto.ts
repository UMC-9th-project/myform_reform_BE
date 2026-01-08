import { Category, Option } from '../../types/item.js';

interface Item {
  images: string[] | null;
  title: string;
  content: string;
  price: number;
  quantity: number;
  delivery: number;
  option: Option[];
  category: Category;
}

export type ItemRequest = Omit<Item, 'images'>;

export class ItemDto implements Item {
  images: string[];
  title: string;
  content: string;
  price: number;
  quantity: number;
  delivery: number;
  option: Option[];
  category: Category;

  constructor(body: ItemRequest) {
    this.images = [];
    this.title = body.title;
    this.content = body.content;
    this.price = body.price;
    this.quantity = body.quantity;
    this.delivery = body.delivery;
    this.option = body.option;
    this.category = body.category;
  }
}

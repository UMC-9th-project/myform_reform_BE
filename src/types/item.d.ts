export interface OptionGroup {
  title: string;
  content: Option[];
  sortOrder: number;
}
export interface Option {
  comment: string;
  price: number;
  quantity: number;
  sortOrder: number;
}

export interface Category {
  major: string;
  sub: string;
}

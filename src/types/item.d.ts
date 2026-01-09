export interface OptionGroup {
  title: string;
  content: Option[];
}
export interface Option {
  comment: string;
  price: number;
  quantity: number;
}

export interface Category {
  major: string;
  sub: string;
}

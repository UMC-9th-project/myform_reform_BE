import type { Prisma } from '@prisma/client';

type ItemWithRelations = Prisma.itemGetPayload<{
  include: {
    owner: {
      select: {
        owner_id: true;
        profile_photo: true;
        nickname: true;
        avg_star: true;
        trade_count: true;
      };
    };
    item_photo: {
      select: {
        content: true;
        photo_order: true;
      };
    };
    option_group: {
      select: {
        option_group_id: true;
        name: true;
        sort_order: true;
        option_item: {
          select: {
            option_item_id: true;
            name: true;
            extra_price: true;
            quantity: true;
            sort_order: true;
          };
        };
      };
    };
  };
}>;

type ReviewWithPhotos = Prisma.reviewGetPayload<{
  include: {
    review_photo: {
      select: {
        content: true;
        photo_order: true;
      };
    };
  };
}>;

type ReviewPhotoWithReview = Prisma.review_photoGetPayload<{
  include: {
    review: {
      select: {
        review_id: true;
      };
    };
  };
}>;

export interface ItemCard {
  item_id: string;
  thumbnail: string;
  title: string;
  price: number;
  star: number;
  review_count: number;
  owner_nickname: string;
  is_wished: boolean;
}

export interface ItemListResponse {
  items: ItemCard[];
  total_count: number;
  page: number;
  limit: number;
}

export interface OptionItem {
  option_item_id: string;
  name: string;
  extra_price: number;
  quantity: number | null;
}

export interface OptionGroup {
  option_group_id: string;
  name: string;
  option_items: OptionItem[];
}

export interface ReformerInfo {
  owner_id: string;
  profile_image: string | null;
  nickname: string | null;
  star: number;
  order_count: number;
}

export interface ItemDetail {
  item_id: string;
  title: string | null;
  images: string[];
  price: number;
  delivery: number;
  delivery_info: string;
  option_groups: OptionGroup[];
  reformer: ReformerInfo;
  is_wished: boolean;
  review_summary: {
    total_review_count: number;
    photo_review_count: number;
    avg_star: number;
    preview_photos: Array<{
      photo_index: number;
      review_id: string;
      photo_url: string;
    }>;
    remaining_photo_count: number;
  };
  reviews: Review[];
}

export interface Review {
  review_id: string;
  user_profile_image: string | null;
  user_nickname: string | null;
  star: number;
  created_at: Date;
  content: string | null;
  product_thumbnail: string | null;
  photos: string[];
}

export interface ReviewListResponse {
  reviews: Review[];
  total_count: number;
  avg_star: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface ReviewPhotoItem {
  photo_index: number;
  review_id: string;
  photo_url: string;
  photo_order: number;
}

export interface ReviewPhotoListResponse {
  photos: ReviewPhotoItem[];
  has_more: boolean;
  offset: number;
  limit: number;
  total_count: number;
}

export interface ReviewDetail {
  review_id: string;
  user_profile_image: string | null;
  user_nickname: string | null;
  star: number;
  created_at: Date;
  content: string | null;
  photo_urls: string[];
  product_thumbnail: string | null;
  current_photo_index?: number;
  total_photo_count?: number;
  has_prev?: boolean;
  has_next?: boolean;
  prev_photo_index?: number;
  next_photo_index?: number;
}

export type { ItemWithRelations, ReviewWithPhotos, ReviewPhotoWithReview };

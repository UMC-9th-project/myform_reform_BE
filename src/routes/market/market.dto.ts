import { IsOptional, IsString, IsIn, IsInt, Min, Max, IsUUID } from 'class-validator';

export class GetItemListRequestDto {
  @IsOptional()
  @IsUUID()
  category_id?: string;

  @IsOptional()
  @IsIn(['popular', 'latest'])
  sort?: 'popular' | 'latest';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export interface GetItemListResponseDto {
  items: Array<{
    item_id: string;
    thumbnail: string;
    title: string;
    price: number;
    star: number;
    review_count: number;
    owner_nickname: string;
    is_wished: boolean;
  }>;
  total_count: number;
  page: number;
  limit: number;
}

export interface GetItemDetailResponseDto {
  item_id: string;
  title: string | null;
  images: string[];
  price: number;
  delivery: number;
  delivery_info: string;
  option_groups: Array<{
    option_group_id: string;
    name: string;
    option_items: Array<{
      option_item_id: string;
      name: string;
      extra_price: number;
      quantity: number | null;
      is_sold_out: boolean;
    }>;
  }>;
  reformer: {
    owner_id: string;
    profile_image: string | null;
    nickname: string | null;
    star: number;
    order_count: number;
  };
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
  reviews: Array<{
    review_id: string;
    user_profile_image: string | null;
    user_nickname: string | null;
    star: number;
    created_at: Date;
    content: string | null;
    product_thumbnail: string | null;
    photos: string[];
  }>;
}

export class GetItemReviewsRequestDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsIn(['latest', 'star_high', 'star_low'])
  sort?: 'latest' | 'star_high' | 'star_low';
}

export interface GetItemReviewsResponseDto {
  reviews: Array<{
    review_id: string;
    user_profile_image: string | null;
    user_nickname: string | null;
    star: number;
    created_at: Date;
    content: string | null;
    product_thumbnail: string | null;
    photos: string[];
  }>;
  total_count: number;
  avg_star: number;
  page: number;
  limit: number;
  total_pages: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export class GetItemReviewPhotosRequestDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export interface GetItemReviewPhotosResponseDto {
  photos: Array<{
    photo_index: number;
    review_id: string;
    photo_url: string;
    photo_order: number;
  }>;
  has_more: boolean;
  offset: number;
  limit: number;
  total_count: number;
}

export class GetReviewDetailRequestDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  photoIndex?: number;
}

export interface GetReviewDetailResponseDto {
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
  has_prev?: boolean; // 이전 사진 존재 여부
  has_next?: boolean; // 다음 사진 존재 여부
  prev_photo_index?: number; // 이전 사진 인덱스
  next_photo_index?: number; // 다음 사진 인덱스
}

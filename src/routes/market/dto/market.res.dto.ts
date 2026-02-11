export class CategoryItemDto {
  categoryId!: string;
  name!: string;
  parentId!: string | null;
  depth!: number;
  sortOrder!: number;
}

export class CategoryTreeItemDto {
  categoryId!: string;
  name!: string;
  sortOrder!: number;
  children!: CategoryTreeItemDto[];
}

export class GetCategoriesResponseDto {
  categories!: CategoryTreeItemDto[];
}

export class GetItemListResponseDto {
  items!: Array<{
    item_id: string;
    thumbnail: string;
    title: string;
    price: number;
    star: number;
    review_count: number;
    owner_nickname: string;
    is_wished: boolean;
  }>;
  total_count!: number;
  page!: number;
  limit!: number;
}

export class GetItemDetailResponseDto {
  item_id!: string;
  title!: string | null;
  category!: {
    major: string | null;
    sub: string | null;
  };
  images!: string[];
  price!: number;
  delivery!: number;
  delivery_info!: string;
  option_groups!: Array<{
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
  content!: string;
  reformer!: {
    owner_id: string;
    profile_image: string | null;
    nickname: string | null;
    star: number;
    star_recent_3m: number;
    order_count: number;
  };
  is_wished!: boolean;
  review_summary!: {
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
  reviews!: Array<{
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

export class GetItemReviewsResponseDto {
  reviews!: Array<{
    review_id: string;
    user_profile_image: string | null;
    user_nickname: string | null;
    star: number;
    created_at: Date;
    content: string | null;
    product_thumbnail: string | null;
    photos: string[];
  }>;
  total_count!: number;
  avg_star!: number;
  page!: number;
  limit!: number;
  total_pages!: number;
  has_next_page!: boolean;
  has_prev_page!: boolean;
}

export class GetItemReviewPhotosResponseDto {
  photos!: Array<{
    photo_index: number;
    review_id: string;
    photo_url: string;
    photo_order: number;
  }>;
  has_more!: boolean;
  offset!: number;
  limit!: number;
  total_count!: number;
}

export class GetReviewDetailResponseDto {
  review_id!: string;
  user_profile_image!: string | null;
  user_nickname!: string | null;
  star!: number;
  created_at!: Date;
  content!: string | null;
  photo_urls!: string[];
  product_thumbnail!: string | null;
  current_photo_index?: number;
  total_photo_count?: number;
  has_prev?: boolean;
  has_next?: boolean;
  prev_photo_index?: number;
  next_photo_index?: number;
}

export interface UserSession {
  is_logged_in: boolean;
  role: 'USER' | 'OWNER' | null;
  user_id: string | null;
  nickname: string | null;
  profile_image: string | null;
  cart_count: number;
}

export interface Banner {
  id: string;
  image_url: string;
}

export interface TrendingItem {
  item_id: string;
  thumbnail: string;
  title: string;
  price: number;
  star: number;
  review_count: number;
  owner_id: string;
  owner_nickname: string;
  is_wished: boolean;
}

export interface CustomOrder {
  proposal_id: string;
  thumbnail: string;
  title: string;
  min_price: number;
  owner_id: string;
  owner_nickname: string;
}

export interface BestReformer {
  owner_id: string;
  nickname: string;
  profile_image: string;
  bio: string;
}

export interface HomeData {
  banners: Banner[];
  trending_items: TrendingItem[];
  custom_orders: CustomOrder[];
  best_reformers: BestReformer[];
}

export interface HomeResponse {
  result: boolean;
  user_session: UserSession;
  home_data: HomeData;
}

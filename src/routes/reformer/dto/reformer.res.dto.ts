// 리폼러 요약 정보 DTO
export interface ReformerSummaryDTO {
  owner_id: string;
  nickname: string;
  keywords: string[];
  bio: string;
  profile_photo: string;
  avg_star: number;
  review_count: number;
  trade_count: number;
}

// 피드 사진 DTO
export interface FeedPhotoDTO {
  feed_id: string;
  content: string | null;
}

// 리폼러 홈 데이터 DTO
export interface ReformerHomeResDTO {
  topReformers: ReformerSummaryDTO[];
  recentFeedPhotos: FeedPhotoDTO[];
}

// 리폼러 검색 응답 DTO
export interface ReformerSearchResDTO {
  reformers: ReformerSummaryDTO[];
  nextCursor: string | null;
  hasNextPage: boolean;
  totalCount: number;
}

// 전체 리폼러 탐색 응답 DTO
export interface ReformerListResDTO {
  reformers: ReformerSummaryDTO[];
  nextCursor: string | null;
  hasNextPage: boolean;
  perPage: number;
  totalCount: number;
}

// 피드 탐색 아이템 DTO
export interface FeedItemDTO {
  feed_id: string;
  photo_url: string | null;
  is_multi_photo: boolean;
}

// 피드 탐색 응답 DTO
export interface ReformerFeedResDTO {
  feeds: FeedItemDTO[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

// 피드 사진 상세 DTO
export interface FeedPhotoDetailDTO {
  photo_order: number;
  url: string | null;
}

// 피드 전체 사진 응답 DTO
export interface FeedPhotosResDTO {
  feed_id: string;
  photos: FeedPhotoDetailDTO[];
}

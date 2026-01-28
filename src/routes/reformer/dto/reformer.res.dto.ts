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

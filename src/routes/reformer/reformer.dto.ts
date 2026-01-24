export interface ReformerSearchReqDTO {
  keyword?: string;
  cursor?: string;
}

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

export interface ReformerSearchResDTO {
  reformers: ReformerSummaryDTO[];
  nextCursor: string | null;
  hasNextPage: boolean;
  totalCount: number;
}

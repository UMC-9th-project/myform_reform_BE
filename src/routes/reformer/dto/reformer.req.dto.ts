export type ReformerSortOption = 'name' | 'rating' | 'trades';

// 리폼러 검색 DTO
export class ReformerSearchReqDTO {
  keyword?: string;
  cursor?: string;
}

// 리폼러 전체 조회 DTO
export class ReformerListReqDTO {
  cursor?: string;
  sort?: ReformerSortOption;
}

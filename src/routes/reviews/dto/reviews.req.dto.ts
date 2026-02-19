import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class ReviewRequestDto {
  userId: string;
  page: number;
  limit: number;

  constructor(userId: string, page: number, limit: number) {
    this.userId = userId;
    this.page = page;
    this.limit = limit;
  }
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

export class GetReviewDetailRequestDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  photoIndex?: number;
}
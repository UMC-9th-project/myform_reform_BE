import { IsOptional, IsIn, IsInt, Min, Max, IsUUID } from 'class-validator';

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

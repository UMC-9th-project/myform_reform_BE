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
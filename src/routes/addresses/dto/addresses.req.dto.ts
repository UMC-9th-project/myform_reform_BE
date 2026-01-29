// 주소 조회 요청 DTO
export class AddressesRequestDto {
  page: number;
  limit: number;
  createdAtOrder: 'asc' | 'desc';
  userId: string;

  constructor(
      page: number, limit: number, userId: string, createdAtOrder: 'asc' | 'desc') {
        this.page = page;
        this.limit = limit;
        this.createdAtOrder = createdAtOrder;
        this.userId = userId;
    }   
}
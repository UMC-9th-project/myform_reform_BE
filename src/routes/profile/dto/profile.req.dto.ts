import { UUID } from '../../../types/common.js';

export class SaleRequestDto {
  type: 'ITEM' | 'REFORM';
  page: number;
  limit: number;
  ownerId: UUID;

  constructor(
    type: 'ITEM' | 'REFORM',
    page: number,
    limit: number,
    ownerId: UUID
  ) {
    this.ownerId = ownerId;
    this.type = type;
    this.page = page;
    this.limit = limit;
  }
}

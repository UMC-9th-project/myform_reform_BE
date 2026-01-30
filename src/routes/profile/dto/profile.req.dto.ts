import { UUID } from '../../../@types/common.js';
import { Category, OptionGroup } from '../../../@types/item.js';

// 판매관리 조회 요청 DTO
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

// 판매 상품 등록 요청 DTO (클라이언트 → Controller)
export class AddItemRequestDto {
  /** @example "빈티지 데님 자켓" */
  title!: string;
  /** @example "90년대 스타일 빈티지 데님 자켓입니다. 상태 양호합니다." */
  content!: string;
  /** @example 45000 */
  price!: number;
  /** @example 3000 */
  delivery!: number;
  option!: OptionGroup[];
  category!: Category;
  /** @example ["https://example.com/images/denim-jacket-front.jpg", "https://example.com/images/denim-jacket-back.jpg"] */
  imageUrls!: string[];
}

// 주문제작 상품 등록 요청 DTO (클라이언트 → Controller)
export class AddReformRequestDto {
  /** @example "청바지 리폼 - 와이드 팬츠 변경" */
  title!: string;
  /** @example "기존 스트레이트 청바지를 와이드 팬츠로 리폼합니다. 밑단 커팅 및 재봉 포함." */
  content!: string;
  /** @example 25000 */
  price!: number;
  /** @example 2500 */
  delivery!: number;
  /** @example 7 */
  expected_working!: number;
  category!: Category;
  /** @example ["https://example.com/images/reform-before.jpg", "https://example.com/images/reform-after.jpg"] */
  imageUrls!: string[];
}

// 판매 상품 내부 전달 DTO (Service → Repository)
// export class ItemDto {
//   ownerId: string;
//   images: { content: string; photo_order: number }[];
//   title: string;
//   content: string;
//   price: number;
//   delivery: number;
//   option: OptionGroup[];
//   category: Category;

//   constructor(body: AddItemRequestDto, ownerId: string) {
//     this.ownerId = ownerId;
//     this.images = body.imageUrls.map((url, i) => ({
//       content: url,
//       photo_order: i + 1
//     }));
//     this.title = body.title;
//     this.content = body.content;
//     this.price = body.price;
//     this.delivery = body.delivery;
//     this.option = body.option;
//     this.category = body.category;
//   }
// }

// 주문제작 상품 내부 전달 DTO (Service → Repository)
// profile.model.ts의 Reform 클래스로 대체
// export class ReformDto {
//   ownerId: string;
//   images: { content: string; photo_order: number }[];
//   title: string;
//   content: string;
//   price: number;
//   delivery: number;
//   expected_working: number;
//   category: Category;
//
//   constructor(body: AddReformRequestDto, ownerId: string) {
//     this.ownerId = ownerId;
//     this.images = body.imageUrls.map((url, i) => ({
//       content: url,
//       photo_order: i + 1
//     }));
//     this.title = body.title;
//     this.content = body.content;
//     this.price = body.price;
//     this.delivery = body.delivery;
//     this.expected_working = body.expected_working;
//     this.category = body.category;
//   }
// }

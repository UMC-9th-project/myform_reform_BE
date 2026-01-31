import { Category } from '../../../@types/item.js';
import { ImageUrls } from '../../common/upload.dto.js';

export interface AddQuoteReq {
  userId: string;
  reform_request_id: string;
  price: number;
  delivery: number;
  content: string;
  expected_working: number;
}

export interface ReformRequestRequest {
  /** @example ["https://image.png"] */
  images: string[];
  /** @example  "제 소중한 기아 쿠로미 유니폼 짐색으로 만들어주실 리폼 장인을 찾아요"*/
  title: string;
  /**
   * @example
   * "기아 유니폼(쿠로미 콜라보)을 짐색으로 만들고 싶어요. 유니폼이 소장용이라 로고/쿠로미 프린트 손상 없이 최대한 예쁘게 살려주실 분 찾습니다!
   * [요청사항]
   * 쿠로미/구단 로고가 정면 중앙에 오도록 부탁드려요.
   * 수납은 메인 수납 1개 + 내부 지퍼포켓 1개 + 외부 포켓 1개 있으면 좋겠습니다.
   * 그리고 바닥판(단단한 심지) 넣어주시고, 지퍼는 YKK급이면 좋겠어요!
   * 스트랩은 길이 조절 가능, 어깨패드 있으면 선호
   * 소장품이라 작업 전/후 사진 공유해주시면 감사해요!"
   */
  contents: string;
  /**@example 0 */
  minBudget: number;
  /**@example 50000 */
  maxBudget: number;
  /**@example 2026-01-31T00:49:39.236Z */
  dueDate: Date;
  /** @example {"major" : "의류", "sub" : "상의"} */
  category: Category;
}

export interface ModifyRequestRequest {
  /** @example ["https://image.png"] */
  images?: string[];
  /** @example  "제목 수정"*/
  title?: string;
  /** @example "내용 수정" */
  contents?: string;
  /** @example 0 */
  minBudget?: number;
  /** @example 50000 */
  maxBudget?: number;
  /** @example 2026-01-31T00:49:39.236Z */
  dueDate?: Date;
  /** @example {"major" : "의류", "sub" : "상의"} */
  category?: Category;
}

export interface ReformProposalRequest {
  /** @example ["https://image.png"] */
  images: string[];
  /** @example "맞춤 자켓 제작" */
  title: string;
  /** @example "고객님의 사이즈에 맞춰 자켓을 제작해드립니다" */
  contents: string;
  /** @example 150000 */
  price: number;
  /** @example 3000 */
  delivery: number;
  /** @example 14 */
  expectedWorking: number;
  /** @example {"major" : "의류", "sub" : "상의"} */
  category: Category;
}

export interface ModifyProposalRequest {
  /** @example ["https://image.png"] */
  images?: string[];
  /** @example "제목 수정" */
  title?: string;
  /** @example "내용 수정" */
  contents?: string;
  /** @example 150000 */
  price?: number;
  /** @example 3000 */
  delivery?: number;
  /** @example 14 */
  expectedWorking?: number;
  /** @example {"major" : "의류", "sub" : "상의"} */
  category?: Category;
}

export class ReformFilter {
  sortBy: 'RECENT' | 'POPULAR' = 'RECENT';
  page: number = 1;
  limit: number = 15;
  category: Category;

  constructor(
    sortBy: 'RECENT' | 'POPULAR',
    page: number,
    limit: number,
    category?: string,
    subcategory?: string
  ) {
    this.sortBy = sortBy;
    this.page = page;
    this.limit = limit;
    this.category = {
      major: category ?? '',
      sub: subcategory ?? ''
    };
  }
}

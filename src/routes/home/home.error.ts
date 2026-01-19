import { BasicError } from '../../middleware/error.js';

/**
 * 메인 페이지 관련 에러
 */
export class HomeError extends BasicError {
  constructor(message: string, description?: string) {
    super(500, 'HOME-ERR-001', message, description || '메인 페이지 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 배너 조회 실패 에러
 */
export class BannerNotFoundError extends BasicError {
  constructor(description?: string) {
    super(404, 'HOME-ERR-002', '배너를 찾을 수 없습니다.', description || '배너 데이터 조회에 실패했습니다.');
  }
}

/**
 * 사용자 세션 조회 실패 에러
 */
export class UserSessionError extends BasicError {
  constructor(description?: string) {
    super(500, 'HOME-ERR-003', '사용자 세션 조회에 실패했습니다.', description || '사용자 또는 오너 정보 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 인기 상품 조회 실패 에러
 */
export class TrendingItemsError extends BasicError {
  constructor(description?: string) {
    super(500, 'HOME-ERR-004', '인기 상품 조회에 실패했습니다.', description || '인기 상품 데이터 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 커스텀 오더 조회 실패 에러
 */
export class CustomOrdersError extends BasicError {
  constructor(description?: string) {
    super(500, 'HOME-ERR-005', '커스텀 오더 조회에 실패했습니다.', description || '커스텀 오더 데이터 조회 중 오류가 발생했습니다.');
  }
}

/**
 * 베스트 리폼러 조회 실패 에러
 */
export class BestReformersError extends BasicError {
  constructor(description?: string) {
    super(500, 'HOME-ERR-006', '베스트 리폼러 조회에 실패했습니다.', description || '베스트 리폼러 데이터 조회 중 오류가 발생했습니다.');
  }
}

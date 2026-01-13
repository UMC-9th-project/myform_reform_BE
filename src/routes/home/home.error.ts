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

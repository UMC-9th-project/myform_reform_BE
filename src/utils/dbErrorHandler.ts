import { Prisma } from '@prisma/client';
import { BasicError } from '../middleware/error.js';

export const handleDbError = (err: any): never => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        // 'email', 'phone' 같은 필드명만 추출
        const fields = (err.meta?.target as string[])?.join(', ') ?? '알 수 없음';
        throw new DatabaseUniqueConstraintError(fields);
      }

      case 'P2003': {
        // 외래키 제약 조건이 걸린 필드명 추출
        const field = (err.meta?.field_name as string) ?? '알 수 없음';
        throw new DatabaseForeignKeyError(field);
      }

      case 'P2025': {
        // meta.cause에 구체적인 이유가 담길 때가 있음
        const cause = (err.meta?.cause as string) ?? '요청한 레코드를 찾을 수 없습니다.';
        throw new DatabaseRecordNotFoundError(cause);
      }

      default:
        throw new BasicError(500, `DB-${err.code}`, '데이터베이스 작업 중 오류가 발생했습니다.', err.message);
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    throw new DbConnectionError('DB 서버 연결 상태를 확인하세요.');
  }

  throw err;
};

/* --- 에러 클래스 정의 --- */

export class DbConnectionError extends BasicError {
  constructor(des?: string) {
    // Message: 공통 / Description: 상세 커스텀
    super(500, 'DB-CONN', '데이터베이스 연결 실패', des ?? '연결할 수 없습니다.');
  }
}

export class DatabaseForeignKeyError extends BasicError {
  constructor(field?: string) {
    super(400, 'DB-P2003', '참조 오류 발생', field ? `다음 필드의 참조 데이터가 없습니다: ${field}` : '연관된 데이터가 존재하지 않습니다.');
  }
}

export class DatabaseRecordNotFoundError extends BasicError {
  constructor(des?: string) {
    super(404, 'DB-P2025', '데이터를 찾을 수 없음', des ?? '해당 데이터가 존재하지 않아 작업을 완료할 수 없습니다.');
  }
}

export class DatabaseUniqueConstraintError extends BasicError {
  constructor(fields?: string) {
    super(409, 'DB-P2002', '중복된 데이터 존재', fields ? `중복된 항목: ${fields}` : '이미 존재하는 데이터입니다.');
  }
}

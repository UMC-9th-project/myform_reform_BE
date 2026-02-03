import { Prisma } from '@prisma/client';
import { BasicError } from '../middleware/error.js';

export const handleDbError = (err: any): never => {
  // 디버깅용 로그 (개발 환경에서만)
  if (process.env.NODE_ENV !== 'production') {
    console.error('DB Error Details:', {
      name: err.name,
      code: err.code,
      message: err.message,
      meta: err.meta,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
    case 'P2002': {
      // Unique constraint 위반
      let fields = '알 수 없는 필드';
      
      if (err.meta?.target) {
        if (Array.isArray(err.meta.target)) {
          fields = err.meta.target.join(', ');
        } else if (typeof err.meta.target === 'string') {
          fields = err.meta.target;
        }
      }
      
      throw new DatabaseUniqueConstraintError(fields);
    }

    case 'P2003': {
      // Foreign key constraint 위반
      let field = '알 수 없는 필드';
      
      // field_name 또는 constraint 확인
      if (err.meta?.field_name && typeof err.meta.field_name === 'string') {
        field = err.meta.field_name;
      } else if (err.meta?.constraint && typeof err.meta.constraint === 'string') {
        field = err.meta.constraint;
      }
      
      throw new DatabaseForeignKeyError(field);
    }

    case 'P2025': {
      // Record not found
      let message = '요청한 레코드를 찾을 수 없습니다.';
      
      if (err.meta?.cause && typeof err.meta.cause === 'string') {
        message = err.meta.cause;
      } else if (err.meta?.modelName && typeof err.meta.modelName === 'string') {
        message = `${err.meta.modelName} 레코드를 찾을 수 없습니다.`;
      }
      
      throw new DatabaseRecordNotFoundError(message);
    }

    case 'P2014': {
      // Required relation violation
      const relation = err.meta?.relation_name ?? '연관 데이터';
      throw new BasicError(400, 'DB-P2014', '필수 관계 위반', `필수 ${relation}가(이) 누락되었습니다.`);
    }

    case 'P2016': {
      // Query interpretation error
      throw new BasicError(400, 'DB-P2016', '쿼리 해석 오류', '잘못된 쿼리 형식입니다.');
    }

    case 'P2021': {
      // Table does not exist
      const table = err.meta?.table ?? '테이블';
      throw new BasicError(500, 'DB-P2021', '테이블 없음', `${table}이(가) 존재하지 않습니다.`);
    }

    case 'P2022': {
      // Column does not exist
      const column = err.meta?.column ?? '컬럼';
      throw new BasicError(500, 'DB-P2022', '컬럼 없음', `${column}이(가) 존재하지 않습니다.`);
    }

    default:
      throw new BasicError(
        500, 
        `DB-${err.code}`, 
        '데이터베이스 작업 중 오류가 발생했습니다.', 
        err.message || '알 수 없는 오류입니다.'
      );
    }
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    throw new DbConnectionError('DB 서버 연결 상태를 확인하세요.');
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    throw new BasicError(400, 'DB-VALIDATION', '데이터 검증 실패', err.message);
  }

  // 일반 에러 처리
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

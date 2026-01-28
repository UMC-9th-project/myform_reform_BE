import { plainToInstance, ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import { ValidationError } from '../routes/cart/cart.error.js';
import { BasicError } from './error.js';

export async function validateOrThrow<T extends object>(
  dtoClass: ClassConstructor<T>,
  payload: unknown
): Promise<T> {
  const dto = plainToInstance(dtoClass, payload) as T;
  const errors = await validate(dto);
  if (errors.length > 0) {
    const e = errors[0];
    const messages = e.constraints ? Object.values(e.constraints) : [];
    const firstMessage =
      messages.length > 0 ? String(messages[0]) : 'Invalid request.';
    throw new ValidationError({
      field: e.property,
      value: e.value,
      messages: firstMessage
    });
  }
  return dto;
}

/**
 * DTO 검증 공통 함수 (orders, market, home용)
 * @param dtoClass DTO 클래스 생성자
 * @param requestBody 검증할 요청 본문
 * @returns 검증된 DTO 인스턴스
 * @throws BasicError 검증 실패 시 (errorCode: 'ERR-VALIDATION', reason: '입력값 검증 실패')
 */
export async function validateDto<T extends object>(
  dtoClass: new () => T,
  requestBody: any
): Promise<T> {
  try {
    const dto = plainToInstance(dtoClass, requestBody);
    const errors = await validate(dto);
    if (errors.length > 0) {
      // 여러 필드 에러를 배열로 수집
      const formattedErrors = errors.map((error) => {
        if (error.constraints) {
          const constraintMessages = Object.values(error.constraints);
          return {
            field: error.property,
            value: error.value,
            messages: constraintMessages[0] || '입력값 검증 실패'
          };
        }
        return {
          field: error.property,
          value: error.value,
          messages: '입력값 검증 실패'
        };
      });
      throw new BasicError(400, 'ERR-VALIDATION', '입력값 검증 실패', formattedErrors);
    }
    return dto;
  } catch (error) {
    if (error instanceof BasicError) {
      throw error;
    }
    throw new BasicError(400, 'ERR-VALIDATION', '입력값 검증 실패', [
      {
        field: 'requestBody',
        value: requestBody,
        messages: '잘못된 요청 본문 형식입니다'
      }
    ]);
  }
}

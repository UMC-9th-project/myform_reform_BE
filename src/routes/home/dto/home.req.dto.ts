import { IsOptional, IsUUID, IsIn } from 'class-validator';

/**
 * JWT 토큰에서 추출할 사용자 정보 (임시 - JWT 구현 시 사용)
 */
export interface AuthUser {
  userId?: string;
  role?: 'USER' | 'OWNER';
}

/**
 * 메인 페이지 요청 DTO (임시 - 헤더/쿼리 파라미터용)
 * TODO: JWT 인증 구현 후 이 부분은 JWT 미들웨어에서 추출
 */
export class GetHomeRequestDto {
  @IsOptional()
  @IsUUID(4, { message: 'userId는 UUID 형식이어야 합니다' })
  userId?: string;

  @IsOptional()
  @IsIn(['USER', 'OWNER'], { message: 'role은 USER 또는 OWNER여야 합니다' })
  role?: 'USER' | 'OWNER';
}

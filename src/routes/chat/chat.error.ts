import { BasicError } from '../../middleware/error.js';

/**
 * 채팅방 생성 시 대상 리소스를 찾지 못했을 때 발생하는 에러
 */
export class TargetNotFoundError extends BasicError {
  constructor(message: string) {
    super(404, 'CHAT-4004', "채팅방 생성 대상 리소스를 찾을 수 없습니다.", message);
  }
}
/**
 * 유효하지 않은 채팅방 타입일 때 발생하는 에러
 */
export class InvalidChatTypeError extends BasicError {
  constructor(message: string) {
    super(400, 'CHAT-4000', "유효하지 않은 채팅방 타입입니다.", message);
  }
}

/**
 * 채팅방 조회 시 대상이 누락되었을 때 발생하는 에러
 */
export class ChatRoomQueryNotFoundError extends BasicError {
  constructor(message: string) {
    super(404, 'CHAT-4014', "채팅방 조회 대상이 누락되었습니다.", message);
  }
}

/**
 * 채팅방 필터가 유효하지 않을 때 발생하는 에러
 */
export class InvalidChatRoomFilterError extends BasicError {
  constructor(message: string) {
    super(400, 'CHAT-4001', "유효하지 않은 채팅방 필터입니다.", message);
  } 
}
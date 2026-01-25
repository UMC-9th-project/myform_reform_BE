import { BasicError } from '../../middleware/error.js';

/**
 * 채팅방 생성 시 대상 리소스를 찾지 못했을 때 발생하는 에러
 */
export class CreateTargetNotFoundError extends BasicError {
  constructor(message: string) {
    super(404, 'CHAT-4004', '채팅방 생성 대상 리소스를 찾을 수 없습니다.', message);
  }
}
/**
 * 유효하지 않은 채팅방 타입일 때 발생하는 에러
 */
export class InvalidChatRoomTypeError extends BasicError {
  constructor(message: string) {
    super(400, 'CHAT-4000', '유효하지 않은 채팅방 타입입니다.', message);
  }
}

/**
 * 채팅방 조회 시 대상이 누락되었을 때 발생하는 에러
 */
export class ChatRoomQueryNotFoundError extends BasicError {
  constructor(message: string) {
    super(404, 'CHAT-4014', '채팅방 조회 대상이 누락되었습니다.', message);
  }
}

/**
 * 채팅방 필터가 유효하지 않을 때 발생하는 에러
 */
export class InvalidChatRoomFilterError extends BasicError {
  constructor(message: string) {
    super(400, 'CHAT-4001', '유효하지 않은 채팅방 필터입니다.', message);
  } 
}

/**
 * 메시지 전송 권한이 없을 때 발생하는 에러
 */
export class ChatMessagePermissionError extends BasicError {
  constructor(message: string) {
    super(403, 'CHAT-4003', '메시지 전송 권한이 없습니다.', message);
  }
}

/**
* 메세지 타입이 유효하지 않을 때 발생하는 에러  
*/
export class InvalidChatMessageTypeError extends BasicError {
  constructor(message: string) {
    super(400, 'CHAT-4002', '유효하지 않은 메시지 타입입니다.', message);
  }
}
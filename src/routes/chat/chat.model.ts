import { InvalidChatTypeError } from './chat.error.js';

export type ChatRoomType = 'REQUEST' | 'PROPOSAL' | 'FEED'
export type ChatRoomFilter = 'INQUIRY' | 'ORDER' | 'UNREAD';

// 채팅방 payload에 담길 타입 정의
export type ChatRoomPayload = 
    | { id: string, title: string, price : number, image: string }
    | { id: string, title: string, minBudget : number, maxBudget : number, image: string }
    | { id: string };

// 채팅메시지 payload에 담길 타입 정의
export type ChatMessagePayload = 
    | {id: string, price: number, delivery: number, expected_working: Date}
    | {id: string, title: string, budget: number, image: string}

// 채팅방 생성, json 변환 클래스
export class ChatRoomFactory {
  static createFromRequest(
    ownerId: string, 
    requesterId: string, 
    target: any,
    type: ChatRoomType
  ): ChatRoom {
    const payload = this.mapToPayload(target, type); 
    
    return new ChatRoom({
      owner_id: ownerId,
      requester_id: requesterId,
      type: type,
      target_payload: payload
    });
  }

  // target > payload 변환로직
  private static mapToPayload(target: any, type: string): ChatRoomPayload {
    switch (type) {
    case 'PROPOSAL':
      return {
        id: target.reform_proposal_id,
        title: target.title,
        price: target.price?.toNumber(),
        image: target.reform_proposal_photo?.[0]?.content
      };
    case 'FEED':
      return {  
        id: target.feed_id
      };
    case 'REQUEST':
      return {
        id: target.reform_request_id,
        title: target.title,
        minBudget: target.min_budget?.toNumber(),
        maxBudget: target.max_budget?.toNumber(),
        image: target.reform_request_photo?.[0]?.content
      };  
    default:
      throw new InvalidChatTypeError('채팅방 생성 시 잘못된 target 타입이 전달되었습니다.');  
    }
  }
}


// 채팅방 도메인 모델
// 읽은시간 조작, 마지막메시지 조작 등은 여기에 메서드 추가
export class ChatRoom {
  constructor(
        private props: {
            // db 생성 필드,조회용
            readonly chat_room_id?: string | null,
            readonly created_at?: Date | null,
            readonly updated_at?: Date | null,
            // 선택 필드
            is_active?: boolean | null,
            owner_last_read_id?: string | null,
            requester_last_read_id?: string | null,
            last_message_id?: string | null,
            owner_unread_count?: number | null,
            requester_unread_count?: number | null,
            // 필수 필드
            owner_id: string,
            requester_id: string,
            type: ChatRoomType,
            target_payload: ChatRoomPayload
        }   
  ) {}

  toPersistence() {
    return {
      type: this.props.type,
      target_payload: this.props.target_payload,
      owner_id: this.props.owner_id,
      requester_id: this.props.requester_id,
    };
  }

  // DB에서 불러온 데이터를 ChatRoom 인스턴스로 변환하는 정적 메서드
  static fromPersistence(data: any): ChatRoom {
    return new ChatRoom({
      ...data,
      target_payload: data.target_payload as ChatRoomPayload
    });
  }
}

// export class ChatMessage{
//   constructor(
//         private props: {
//             // db 생성 필드,조회용
//             readonly message_id?: string,
//             readonly created_at?: Date,
//             readonly updated_at?: Date,
//             // 선택 필드
//             text_content?: string,
//             payload?: ChatMessagePayload,
//             // 필수 필드
//             chat_room_id: string,
//             sender_id: string,
//             sender_type: 'OWNER' | 'REQUESTER',
//         }   
//   ) {}
// }
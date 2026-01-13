import { Server, Socket } from 'socket.io';
import { WebSocketServer } from './websocket.js';

export function setupChatEventHandlers(io: Server, socket: Socket): void {
  const socketId = socket.id;
  const roomId = socket.handshake.headers.roomid as string;
  const userMap = WebSocketServer.getInstance().userMap;

  if (roomId) {
    // 해당 방이 없으면 새로 만들고, 있으면 기존 배열에 추가
    if (!userMap.has(roomId)) {
      userMap.set(roomId, []);
    }
    userMap.get(roomId)?.push(socketId);
        
    void socket.join(`user-${socketId}`); 
    console.log(`[연결] 방: ${roomId}, 소켓: ${socketId} 추가됨`);
  }

  // 메시지 수신 핸들러
  socket.on('sendMessage', (data: { roomId: string, message: string }) => {
    console.log(`[수신] ${socketId} -> 방 ${data.roomId}: ${data.message}`);
    const { roomId, message } = data;
    const targetIds = userMap.get(roomId);

    if (targetIds) {
      // 방에 참여한 상대방에게 메시지 전송
      targetIds.forEach((receiverId) => {
        if (receiverId !== socketId) {
          io.to(`user-${receiverId}`).emit('receiveMessage', {
            roomId,
            message,
            sender: socketId
          });
          console.log(`[전송] ${socketId} -> ${receiverId} (${roomId})`);
        }
      });
    }
  });

  // 연결 해제 시 배열에서 제거
  socket.on('disconnect', () => {
    const targetIds = userMap.get(roomId);
    if (targetIds) {
      const index = targetIds.indexOf(socketId);
      if (index > -1) {
        targetIds.splice(index, 1); // 배열에서 내 소켓 ID 제거
      }
      // 방에 아무도 없으면 Map에서 삭제
      if (targetIds.length === 0) {
        userMap.delete(roomId);
      }
    }
    console.log(`[해제] ${socketId} 가 방 ${roomId}에서 나감`);
  });
}
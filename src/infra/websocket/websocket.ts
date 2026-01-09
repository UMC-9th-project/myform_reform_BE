import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { setupChatEventHandlers } from './chat.js';

// 싱글톤 웹소켓 서버 클래스
export class WebSocketServer {
  private static instance : WebSocketServer;
  private io: Server | null = null;
  public userMap: Map<string, string[]> = new Map();

  private constructor() {
    console.log('==웹소켓 서버 시작==');
  }

  public static getInstance(): WebSocketServer {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer();
    }
    return WebSocketServer.instance;
  }
  public init(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: { 
        origin: '*' 
      },
      pingInterval: 25000,
      pingTimeout: 5000
    });

    this.io.use((socket, next) => {
      const token = socket.handshake.query.token; 

      // 테스트용 토큰 검증
      if (token === 'test-token') {
        next();
      } else {
        const err = new Error('인증 실패: 유효하지 않은 토큰입니다.');
        next(err);
      }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`웹소켓 연결 성공: ${socket.id}`);
      setupChatEventHandlers(this.io!, socket);
    });
  }
}
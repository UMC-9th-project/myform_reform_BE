import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ChatEventHandler } from './eventHandler.js';
import { ChatWebSocketAuthError } from '../../routes/chat/chat.error.js';
import jwt from 'jsonwebtoken';

// 싱글톤 웹소켓 서버 클래스
export class WebSocketServer {
  // 서버 시작과 동시에 인스턴스 생성
  private static instance : WebSocketServer;
  private io: Server | null = null;
  private chatEventHandler: ChatEventHandler | null = null;

  private constructor() {
    console.log('==웹소켓 서버 시작==');
  }
  // 서버 시작시 인스턴스 반환
  public static getInstance(): WebSocketServer {
    if (!WebSocketServer.instance) {
      WebSocketServer.instance = new WebSocketServer();
    }
    return WebSocketServer.instance;
  }

  // 웹소켓 서버 초기화 메서드
  public init(httpServer: HttpServer): void {
    this.io = new Server(httpServer, {
      cors: { 
        origin: '*' 
      },
      pingInterval: 25000,
      pingTimeout: 5000
    });

    this.chatEventHandler = new ChatEventHandler(this.io);

    // JWT 토큰 기반 인증 미들웨어
    this.io.use((socket, next) => {
      const token = socket.handshake.headers['auth'] as string;
      const jwtSecret = process.env.JWT_SECRET || '';

      if (!token) {
        return next(new ChatWebSocketAuthError('인증 토큰이 필요합니다.'));
      }

      try {
        // JWT 검증
        const decoded = jwt.verify(token, jwtSecret) as any;
        
        // socket.data에 사용자 정보 저장
        socket.data.userId = decoded.id;
        socket.data.type = decoded.role === 'reformer' ? 'OWNER' : 'USER';
        
        next();
      } catch (error) {
        next(new ChatWebSocketAuthError('유효하지 않은 토큰입니다.'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`웹소켓 연결 성공: ${socket.id}`);
      this.chatEventHandler!.setup(socket);
    });
  }

  // io 인스턴스 반환 메서드
  public getIoInstance(): Server {
    if (!this.io) {
      throw new Error('웹소켓 서버가 초기화되지 않았습니다.');
    }
    return this.io;
  }

  // 채팅 이벤트 핸들러 반환 메서드
  public getHandler(): ChatEventHandler {
  if (!this.chatEventHandler) {
    throw new Error('웹소켓 핸들러가 초기화되지 않았습니다.');
  }
  return this.chatEventHandler;
  }
}
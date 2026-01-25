import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ChatEventHandler } from './eventHandler.js';

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

    // 핸드 셰이크 미들웨어로 인증 처리(테스트용)
    this.io.use((socket, next) => {
      const userId = socket.handshake.query.userId as string;
      const authType = socket.handshake.query.authType as 'OWNER' | 'USER';

      if (userId && authType) {
        socket.data.userId = userId; 
        socket.data.type = authType;
        next();
      } else {
        const err = new Error('인증 실패: userId와 authType이 필요합니다.');
        next(err);
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

}
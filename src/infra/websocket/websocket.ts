import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { ChatEventHandler } from './eventHandler.js';
import { ChatWebSocketAuthError } from '../../routes/chat/chat.error.js';
import jwt from 'jsonwebtoken';

// 싱글톤 웹소켓 서버 클래스
export class WebSocketServer {
  // 서버 시작과 동시에 인스턴스 생성
  private static instance: WebSocketServer;
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
    const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((origin) =>
          origin.trim()
        )
      : [];

    this.io = new Server(httpServer, {
      cors: {
        // 로컬 개발 주소와 실제 서비스 도메인을 같이 허용
        origin: allowedOrigins,
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingInterval: 25000,
      pingTimeout: 5000
    });

    this.chatEventHandler = new ChatEventHandler(this.io);

    this.io.use((socket, next) => {
      // 토큰 로직 추출
      const authHeader =
        (socket.handshake.headers['auth'] as string) || // 기본 방식
        socket.handshake.auth?.token || // 공식 표준, 포스트맨에서 테스트 불가
        (socket.handshake.headers['authorization'] as string); // 공식 방식 안된다면 사용

      const jwtSecret = process.env.JWT_SECRET || '';

      if (!authHeader) {
        return next(new ChatWebSocketAuthError('인증 토큰이 필요합니다.'));
      }

      //'Bearer ' 접두사가 있을 경우 제거
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : authHeader;

      try {
        const decoded = jwt.verify(token, jwtSecret) as {
          id: string;
          role: string;
          exp: number;
        };

        socket.data.userId = decoded.id;
        socket.data.type = decoded.role === 'reformer' ? 'OWNER' : 'USER';

        // 만료 시간 기반 자동 연결 종료
        if (decoded.exp) {
          const remainingTime = decoded.exp * 1000 - Date.now();

          if (remainingTime <= 0) {
            return next(new ChatWebSocketAuthError('만료된 토큰입니다.'));
          }

          // 만료 시점에 서버가 먼저 끊고 알림
          const expiryTimer = setTimeout(() => {
            // 프론트엔드가 감지할 수 있도록 이벤트 전송
            socket.emit('token_expired', {
              message: '세션이 만료되었습니다. 다시 로그인해주세요.'
            });
            socket.disconnect(true);
          }, remainingTime);

          // 연결 종료 시 타이머 제거
          socket.on('disconnect', () => {
            clearTimeout(expiryTimer);
          });
        }

        next();
      } catch (error) {
        next(new ChatWebSocketAuthError('유효하지 않거나 만료된 토큰입니다.'));
      }
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`웹소켓 연결 성공: ${socket.id}`);

      // // Transport 레벨 핑퐁 모니터링
      // const transport = (socket.conn as any).transport;
      // console.log(`[연결] ${socket.data.userId} - Transport: ${transport.name}`);

      // // 핑퐁 이벤트 모니터링 (engine.io 레벨)
      // socket.conn.on('packet', (packet: any) => {
      //   if (packet.type === 'ping') {
      //     console.log(`[PING 수신] 사용자 ${socket.data.userId} (${socket.id})`);
      //   } else if (packet.type === 'pong') {
      //     console.log(`[PONG 전송] 사용자 ${socket.data.userId} (${socket.id})`);
      //   }
      // });

      // socket.conn.on('packetCreate', (packet: any) => {
      //   if (packet.type === 'ping') {
      //     console.log(`[PING 생성] 사용자 ${socket.data.userId} (${socket.id})`);
      //   }
      // });

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

import express from 'express';
import morgan from 'morgan';
import swaggerJson from './config/swagger.json' with { type: 'json' };
import * as swaggerUI from 'swagger-ui-express';
import { RegisterRoutes } from './routes/tsoaRoutes.js';
import dotenv from 'dotenv';
import 'reflect-metadata';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { WebSocketServer } from './infra/websocket/websocket.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({
  origin: process.env.FRONTEND_URL!,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
RegisterRoutes(app);

app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerJson));

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(3001);

// 웹소켓 서버 초기화
const webSocketServer = WebSocketServer.getInstance();
webSocketServer.init(server);
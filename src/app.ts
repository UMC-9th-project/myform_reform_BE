import express from 'express';
import morgan from 'morgan';
import swaggerJson from './config/swagger.json' with { type: 'json' };
import * as swaggerUI from 'swagger-ui-express';
import { RegisterRoutes } from './routes/tsoaRoutes.js';
import dotenv from 'dotenv';
import 'reflect-metadata';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { WebSocketServer } from './infra/websocket/websocket.js';
import './worker/search.worker.js';
import cookieParser from 'cookie-parser';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  : [];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'Origin', 'Access-Control-Allow-Headers']
}));
RegisterRoutes(app);

app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerJson));

app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(3001);

// 웹소켓 서버 초기화
const webSocketServer = WebSocketServer.getInstance();
webSocketServer.init(server);
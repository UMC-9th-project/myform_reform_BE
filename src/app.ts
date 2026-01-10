import express from 'express';
import morgan from 'morgan';
import swaggerJson from './config/swagger.json' with { type: 'json' };
import * as swaggerUI from 'swagger-ui-express';
import { RegisterRoutes } from './routes/tsoaRoutes.js';
import dotenv from 'dotenv';
import 'reflect-metadata';
import { errorHandler, notFoundHandler } from './middleware/error.js';

dotenv.config();
const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
RegisterRoutes(app);

app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerJson));

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(3001);

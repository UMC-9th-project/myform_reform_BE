import express from 'express';
import morgan from 'morgan';
import * as swaggerJson from './config/swagger.json';
import * as swaggerUI from 'swagger-ui-express';
import { RegisterRoutes } from './routes/tsoaRoutes';
import dotenv from 'dotenv';
// import { errorHandler } from './middleware/error';

dotenv.config();
const app = express();
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
RegisterRoutes(app);
app.use('/docs', swaggerUI.serve, swaggerUI.setup(swaggerJson));
//   app.use(errorHandler);

app.listen(3001);

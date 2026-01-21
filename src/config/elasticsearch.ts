import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import path from 'path';

const certPath = path.join(process.cwd(), 'certs', 'ca', 'ca.crt');
const ELASTIC_PASSWORD = process.env.ELASTIC_PASSWORD;

if (!ELASTIC_PASSWORD) {
  throw new Error('❌ .env파일에 ELASTIC_PASSWORD가 없습니다.');
}

export const esClient = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: ELASTIC_PASSWORD
  },
  tls: {
    ca: fs.readFileSync(certPath),
    rejectUnauthorized: true
  }
});

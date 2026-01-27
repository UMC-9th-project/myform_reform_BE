import { Client } from '@elastic/elasticsearch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const certPath = path.join(process.cwd(), 'certs', 'ca', 'ca.crt');
const ELASTIC_PASSWORD = process.env.ELASTIC_PASSWORD;
const ELASTIC_NODE = process.env.ELASTIC_NODE;

if (!ELASTIC_PASSWORD || !ELASTIC_NODE) {
  throw new Error(
    '❌ .env파일에 ELASTIC_PASSWORD 또는 ELASTIC_NODE가 없습니다.'
  );
}

export const esClient = new Client({
  node: ELASTIC_NODE,
  auth: {
    username: 'elastic',
    password: ELASTIC_PASSWORD
  },
  headers: {
    accept: 'application/vnd.elasticsearch+json; compatible-with=8',
    ['content-type']: 'application/vnd.elasticsearch+json; compatible-with=8'
  },
  tls: {
    ca: fs.readFileSync(certPath),
    rejectUnauthorized: true
  }
});

/*
async function checkConnection() {
  try {
    await esClient.ping();
    console.log('🚀 [Elasticsearch] Connecton Success');
  } catch (error) {
    console.error('❌ [Elasticsearch] Connection Failed');
  }
}

checkConnection();
*/

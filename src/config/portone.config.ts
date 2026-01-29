import axios, { AxiosInstance } from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// 포트원 테스트 모드 설정
const PORTONE_REST_API_KEY = process.env.PORTONE_REST_API_KEY;
const PORTONE_REST_API_SECRET = process.env.PORTONE_REST_API_SECRET;
const PORTONE_API_BASE_URL = 'https://api.iamport.kr';

// 액세스 토큰 캐시 (토큰 만료 전까지 재사용)
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * 포트원 액세스 토큰 발급
 */
async function getAccessToken(): Promise<string> {
  // 캐시된 토큰이 있고 아직 만료되지 않았으면 재사용
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  try {
    const response = await axios.post(
      `${PORTONE_API_BASE_URL}/users/getToken`,
      {
        imp_key: PORTONE_REST_API_KEY,
        imp_secret: PORTONE_REST_API_SECRET
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`포트원 토큰 발급 실패: ${response.data.message}`);
    }

    const { access_token, expired_at } = response.data.response;
    
    // 토큰 캐시 (만료 1분 전까지 유효)
    cachedAccessToken = access_token;
    tokenExpiresAt = expired_at * 1000 - 60000; // 만료 1분 전

    return access_token;
  } catch (error: any) {
    throw new Error(`포트원 토큰 발급 오류: ${error.message}`);
  }
}

/**
 * 포트원 결제 정보 조회
 */
export interface PortonePaymentInfo {
  imp_uid: string;
  merchant_uid: string;
  status: string;
  amount: number;
  pay_method: string;
  pg_provider: string;
  pg_id: string;
  card_name?: string;
  card_number?: string;
  card_code?: string;
  card_quota?: number;
  card_type?: string;
  paid_at: number;
  receipt_url?: string;
}

export async function getPortonePayment(impUid: string): Promise<PortonePaymentInfo> {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.get(
      `${PORTONE_API_BASE_URL}/payments/${impUid}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`포트원 결제 조회 실패: ${response.data.message}`);
    }

    return response.data.response;
  } catch (error: any) {
    throw new Error(`포트원 결제 조회 오류: ${error.message}`);
  }
}

/**
 * 포트원 결제 취소
 */
export async function cancelPortonePayment(
  impUid: string,
  reason?: string
): Promise<void> {
  try {
    const accessToken = await getAccessToken();

    const response = await axios.post(
      `${PORTONE_API_BASE_URL}/payments/cancel`,
      {
        imp_uid: impUid,
        reason: reason || '주문 취소'
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code !== 0) {
      throw new Error(`포트원 결제 취소 실패: ${response.data.message}`);
    }
  } catch (error: any) {
    throw new Error(`포트원 결제 취소 오류: ${error.message}`);
  }
}

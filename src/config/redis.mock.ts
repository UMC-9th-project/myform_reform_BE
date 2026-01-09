// 실제 Redis 서버 연결 전까지 사용할 Mock Redis 클래스입니다.

class MockRedis {
  private storage = new Map<string, { value: string; expiry: number | null }>();
  
  // 데이터 저장 (EX 옵션으로 초 단위 만료 설정 가능)
  async set(key: string, value: string, mode?: 'EX', seconds?: number): Promise<'OK'> {
    let expiry: number | null = null;
      
    if (mode === 'EX' && seconds) {
      expiry = Date.now() + seconds * 1000;
        
      // 유효 시간이 지나면 자동으로 삭제되도록 타이머 설정
      setTimeout(() => {
        const item = this.storage.get(key);
        if (item && item.expiry && item.expiry <= Date.now()) {
          this.storage.delete(key);
        }
      }, seconds * 1000);
    }
  
    this.storage.set(key, { value, expiry });
    return 'OK';
  }
  
  // 데이터 조회
  async get(key: string): Promise<string | null> {
    const item = this.storage.get(key);
      
    if (!item) return null;
  
    // 조회 시점에 만료 시간이 지났는지 한 번 더 체크
    if (item.expiry && item.expiry <= Date.now()) {
      this.storage.delete(key);
      return null;
    }
  
    return item.value;
  }
  
  // 데이터 삭제
  async del(key: string): Promise<number> {
    const deleted = this.storage.delete(key);
    return deleted ? 1 : 0;
  }
  
  // 키 존재 여부 확인
  async exists(key: string): Promise<number> {
    const item = await this.get(key);
    return item ? 1 : 0;
  }
}
  
// 싱글톤 패턴으로 내보내기
export const mockRedis = new MockRedis();
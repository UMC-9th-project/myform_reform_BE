import prisma from '../src/config/prisma.config';

describe('Prisma 데이터베이스 연결 테스트', () => {
  beforeAll(async () => {
    // 테스트 시작 전 연결 확인
    await prisma.$connect();
  });

  afterAll(async () => {
    // 테스트 종료 후 연결 해제
    await prisma.$disconnect();
  });

  test('데이터베이스 연결 성공 테스트', async () => {
    // Prisma Client가 정상적으로 연결되어 있는지 확인
    expect(prisma).toBeDefined();

    // $queryRaw를 사용해 실제 쿼리 실행 테스트
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    expect(result).toBeDefined();
  });

  test('데이터베이스 버전 확인 테스트', async () => {
    // PostgreSQL 버전 확인
    const version = await prisma.$queryRaw`SELECT version()`;
    expect(version).toBeDefined();
    expect(Array.isArray(version)).toBe(true);
  });

  test('Prisma Client 기본 쿼리 테스트', async () => {
    // User 테이블 카운트 쿼리 (데이터 없어도 0 반환)
    const userCount = await prisma.user.count();
    expect(typeof userCount).toBe('number');
    expect(userCount).toBeGreaterThanOrEqual(0);
  });

  test('트랜잭션 연결 테스트', async () => {
    // 트랜잭션이 정상 작동하는지 테스트
    await expect(
      prisma.$transaction(async (tx) => {
        const users = await tx.user.findMany({ take: 1 });
        return users;
      })
    ).resolves.toBeDefined();
  });

  test('여러 모델 접근 테스트', async () => {
    // 여러 테이블에 동시 접근 가능한지 확인
    const [userCount, ownerCount, categoryCount] = await Promise.all([
      prisma.user.count(),
      prisma.owner.count(),
      prisma.category.count()
    ]);

    expect(typeof userCount).toBe('number');
    expect(typeof ownerCount).toBe('number');
    expect(typeof categoryCount).toBe('number');
  });

  test('연결 상태 확인 테스트', async () => {
    // Prisma Client의 연결 상태를 확인
    await expect(prisma.$executeRaw`SELECT 1`).resolves.toBeDefined();
  });
});

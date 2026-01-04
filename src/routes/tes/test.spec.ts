import { TestService } from './test.service.js';

let T: TestService;

beforeAll(() => {
  T = new TestService();
});

test('서비스 테스트', async () => {
  const answer = await T.helloworld();
  expect(answer).toEqual('hello world');
});

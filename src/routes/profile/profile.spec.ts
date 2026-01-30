import { ProfileRepository } from './profile.repository.js';

test('test', async () => {
  const profielModel = new ProfileRepository();
  const owenrId = '7786f300-6e37-41b3-8bfb-2bca27846785';
  const orderId = '78e9d83a-fe9f-4b74-af1e-b16fb624dafa';
  const data = await profielModel.getOrderDetail(owenrId, orderId);
  console.dir(data);
});

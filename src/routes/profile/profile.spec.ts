import { ProfileModel } from './profile.model.js';

test('test', async () => {
  const profielModel = new ProfileModel();
  console.dir(
    await profielModel.getSales('ITEM', 'cf8b817a-4a6e-43db-bfc0-dc38a67001b5')
  );
});

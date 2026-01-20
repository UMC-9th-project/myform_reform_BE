import { ReformModel } from './reform.model.js';
import { ReformService } from './reform.service.js';
test('test', async () => {
  const reform = new ReformModel();
  console.dir(await reform.selectRequestLatest(), { depth: null });
  console.dir(await reform.selectProposalLatest(), { depth: null });
});

import {
  Body,
  Controller,
  Get,
  Patch,
  Path,
  Post,
  Query,
  Request,
  Route,
  Tags
} from 'tsoa';
import { ResponseHandler, SuccessResponse } from '../../config/tsoaResponse';
import { TestService } from './test.service';

@Route('project')
@Tags('project node CRUD')
export class TestController extends Controller {
  private TestService: TestService;

  constructor() {
    super();
    this.TestService = new TestService();
  }
  @Get('/')
  public async setTest(): Promise<SuccessResponse<string>> {
    const answer = await this.TestService.helloworld();
    return new ResponseHandler(answer);
  }
}

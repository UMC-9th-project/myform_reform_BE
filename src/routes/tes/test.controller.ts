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
import { ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { TestService } from './test.service.js';

@Route('project')
@Tags('project node CRUD')
export class TestController extends Controller {
  private testService: TestService;

  constructor() {
    super();
    this.testService = new TestService();
  }
  @Get('/')
  public async setTest(): Promise<TsoaResponse<string>> {
    const answer = await this.testService.helloworld();
    return new ResponseHandler(answer);
  }
}

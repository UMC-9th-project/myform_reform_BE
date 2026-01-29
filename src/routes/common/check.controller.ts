import { Controller, Get, Route, Tags } from 'tsoa';
import { ResponseHandler, TsoaResponse } from '../../config/tsoaResponse.js';
import { CheckService, HealthCheckResult } from './check.service.js';

@Route('/')
@Tags('health check')
export class CheckController extends Controller {
  private checkService: CheckService;

  constructor() {
    super();
    this.checkService = new CheckService();
  }

  @Get('/')
  public async ping(): Promise<TsoaResponse<string>> {
    return new ResponseHandler('ok');
  }

  @Get('/health')
  public async healthCheck(): Promise<TsoaResponse<HealthCheckResult>> {
    const result = await this.checkService.healthCheck();

    if (result.status === 'unhealthy') {
      this.setStatus(503);
    }

    return new ResponseHandler(result);
  }
}

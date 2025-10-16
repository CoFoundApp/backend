import { Controller, Get, Header, HttpCode, HttpStatus } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';

@Controller('metrics')
export class MonitoringController {
  constructor(private readonly monitoring: MonitoringService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @Header('Cache-Control', 'no-store, max-age=0')
  async metrics(): Promise<string> {
    return this.monitoring.snapshot();
  }
}

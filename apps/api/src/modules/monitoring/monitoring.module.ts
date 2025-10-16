import { Global, Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { QueueMetricsCollector } from './queue-metrics.collector';

@Global()
@Module({
  providers: [MonitoringService, QueueMetricsCollector],
  controllers: [MonitoringController],
  exports: [MonitoringService],
})
export class MonitoringModule {}

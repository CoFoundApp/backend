import { Global, Module } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringController } from './monitoring.controller';
import { QueueMetricsCollector } from './queue-metrics.collector';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { KpiMetricsCollector } from './kpi-metrics.collector';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [MonitoringService, QueueMetricsCollector, KpiMetricsCollector],
  controllers: [MonitoringController],
  exports: [MonitoringService],
})
export class MonitoringModule {}

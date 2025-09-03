import { Module } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { NotificationService } from './notification.service';
import { NotificationResolver } from './notification.resolver';
import { JSONScalar } from '../../common/scalars/json.scalar';

@Module({
  providers: [
    NotificationService,
    NotificationResolver,
    PrismaService,
    { provide: JSONScalar.name, useValue: JSONScalar },
  ],
  exports: [NotificationService]
})
export class NotificationModule {}

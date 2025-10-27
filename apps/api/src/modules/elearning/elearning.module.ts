import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { NotificationModule } from '../notifications/notification.module';
import { ElearningService } from './elearning.service';
import { ElearningResolver } from './elearning.resolver';
import { ElearningEditorResolver } from './elearning-editor.resolver';
import { JSONScalar } from '../../common/scalars/json.scalar';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [PrismaModule, forwardRef(() => AuthModule), NotificationModule],
  providers: [
    ElearningService,
    ElearningResolver,
    ElearningEditorResolver,
    RolesGuard,
    { provide: JSONScalar.name, useValue: JSONScalar },
  ],
})
export class ElearningModule {}

import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { SessionGuard } from './guards/session.guard';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { RedisModule } from '../../infra/redis/redis.module';

@Global()
@Module({
  imports: [
    PassportModule.register({ session: false }),
    PrismaModule,
    RedisModule,
  ],
  providers: [
    JwtAccessStrategy,
    JwtRefreshStrategy,
    AuthService,
    AuthResolver,
    SessionGuard
  ],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}

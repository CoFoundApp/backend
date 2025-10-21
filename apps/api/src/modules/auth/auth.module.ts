import { Global, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { SessionGuard } from './guards/session.guard';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { RedisModule } from '../../infra/redis/redis.module';
import { EmailVerificationService } from './email-verification.service';
import { TwoFactorService } from './two-factor.service';
import { OAuthService } from './oauth.service';

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
    SessionGuard,
    EmailVerificationService,
    TwoFactorService,
    OAuthService,
  ],
  exports: [AuthService, SessionGuard, EmailVerificationService, TwoFactorService, OAuthService],
})
export class AuthModule {}

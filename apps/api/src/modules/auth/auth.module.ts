import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { PrismaModule } from '../../infra/prisma/prisma.module';

@Module({
  imports: [PassportModule.register({ session: false }), PrismaModule],
  providers: [JwtAccessStrategy, JwtRefreshStrategy, AuthService, AuthResolver],
  exports: [],
})
export class AuthModule {}

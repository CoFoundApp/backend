import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BillingService } from './billing.service';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CustomerPortalSessionDto } from './dto/customer-portal-session.dto';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: { sub: string };
}

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('catalog')
  getCatalog() {
    return this.billing.getPublicCatalog();
  }

  @Post('checkout-session')
  @UseGuards(AuthGuard('jwt'))
  async createCheckoutSession(@Req() req: AuthenticatedRequest, @Body() dto: CreateCheckoutSessionDto) {
    if (!req.user?.sub) throw new Error('Utilisateur non authentifié');
    return this.billing.createCheckoutSession(req.user.sub, dto);
  }

  @Post('portal-session')
  @UseGuards(AuthGuard('jwt'))
  async createPortalSession(@Req() req: AuthenticatedRequest, @Body() dto: CustomerPortalSessionDto) {
    if (!req.user?.sub) throw new Error('Utilisateur non authentifié');
    return this.billing.createCustomerPortalSession(req.user.sub, dto);
  }
}

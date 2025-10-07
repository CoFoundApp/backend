import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { BillingAdminService } from './billing-admin.service';

@Controller('admin/billing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('admin')
export class BillingAdminController {
  constructor(private readonly admin: BillingAdminService) {}

  @Get('customers')
  listCustomers() {
    return this.admin.listCustomers();
  }

  @Post('sync')
  forceSync(@Body('stripeCustomerId') stripeCustomerId: string) {
    return this.admin.forceSyncCustomer(stripeCustomerId);
  }

  @Post('entitlements')
  updateEntitlement(
    @Body('subscriptionId') subscriptionId: string,
    @Body('featureCode') featureCode: string,
    @Body('limit') limit?: number,
  ) {
    return this.admin.updateEntitlement(subscriptionId, featureCode, limit ?? null);
  }

  @Post('sequences/:year')
  regenerateSequence(@Param('year', ParseIntPipe) year: number) {
    return this.admin.regenerateInvoiceSequence(year);
  }
}

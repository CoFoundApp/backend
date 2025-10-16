import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { BillingWebhookService } from './billing-webhook.service';
import type { Request } from 'express';

@Controller('stripe')
export class BillingWebhookController {
  constructor(private readonly webhookService: BillingWebhookService) {}

  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Req() req: Request & { rawBody?: Buffer },
    @Body() body: any,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = (req as any).rawBody ?? (req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(body)));
    await this.webhookService.receiveWebhook(payload, signature);
    return { received: true };
  }
}

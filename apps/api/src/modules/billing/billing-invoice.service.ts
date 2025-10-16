import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { invoice_status, invoices, Prisma } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StripeService } from './stripe/stripe.service';
import { StripeInvoice } from './stripe/stripe.types';

@Injectable()
export class BillingInvoiceService {
  private readonly logger = new Logger(BillingInvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  async upsertFromStripe(params: {
    stripeInvoice: StripeInvoice;
    subscriptionId: string;
    billingCustomerId?: string | null;
  }): Promise<{ record: invoices; created: boolean; previousStatus: invoice_status | null }> {
    const { stripeInvoice, subscriptionId, billingCustomerId } = params;
    const legalMention = this.resolveLegalMention(stripeInvoice);
    const footer = this.buildFooter(legalMention);
    await this.ensureStripeFooter(stripeInvoice, footer);
    const { invoice: syncedInvoice, pdfUrl } = await this.ensureInvoicePdf(stripeInvoice);

    return this.prisma.$transaction(async tx => {
      const existing = await tx.invoices.findUnique({
        where: { stripe_invoice_id: syncedInvoice.id },
      });
      const invoiceNumber = await this.ensureInvoiceNumber(tx, syncedInvoice);
      const subtotal = syncedInvoice.subtotal ?? syncedInvoice.amount_subtotal ?? 0;
      const total = syncedInvoice.total ?? syncedInvoice.amount_due ?? 0;
      const tax = syncedInvoice.tax ?? syncedInvoice.total_tax_amounts?.reduce((sum, taxAmount) => sum + (taxAmount.amount ?? 0), 0) ?? 0;
      const taxRate = syncedInvoice.total_tax_amounts?.[0]?.rate?.percentage ?? null;
      const issuedAt = syncedInvoice.created ? new Date(syncedInvoice.created * 1000) : new Date();
      const dueAt = syncedInvoice.due_date ? new Date(syncedInvoice.due_date * 1000) : null;
      const paidAt = syncedInvoice.status_transitions?.paid_at ? new Date(syncedInvoice.status_transitions.paid_at * 1000) : syncedInvoice.paid ? new Date() : null;

      const status = this.mapInvoiceStatus(syncedInvoice.status);

      const record = await tx.invoices.upsert({
        where: { stripe_invoice_id: syncedInvoice.id },
        update: {
          subscription_id: subscriptionId,
          billing_customer_id: billingCustomerId ?? undefined,
          amount_cents: total,
          subtotal_cents: subtotal,
          total_cents: total,
          tax_amount_cents: tax,
          tax_rate_percent: taxRate ? new Prisma.Decimal(taxRate) : undefined,
          currency: (stripeInvoice.currency ?? 'eur').toUpperCase(),
          status,
          issued_at: issuedAt,
          due_at: dueAt ?? undefined,
          paid_at: paidAt ?? undefined,
          external_invoice_id: syncedInvoice.id,
          pdf_url: pdfUrl,
          number: invoiceNumber,
          footer,
          legal_mention: legalMention,
        },
        create: {
          subscription_id: subscriptionId,
          billing_customer_id: billingCustomerId ?? undefined,
          amount_cents: total,
          subtotal_cents: subtotal,
          total_cents: total,
          tax_amount_cents: tax,
          tax_rate_percent: taxRate ? new Prisma.Decimal(taxRate) : undefined,
          currency: (stripeInvoice.currency ?? 'eur').toUpperCase(),
          status,
          issued_at: issuedAt,
          due_at: dueAt ?? undefined,
          paid_at: paidAt ?? undefined,
          external_invoice_id: syncedInvoice.id,
          pdf_url: pdfUrl,
          stripe_invoice_id: syncedInvoice.id,
          number: invoiceNumber,
          footer,
          legal_mention: legalMention,
        },
      });

      return {
        record,
        created: !existing,
        previousStatus: existing?.status ?? null,
      };
    });
  }

  private async ensureInvoicePdf(invoice: StripeInvoice): Promise<{ invoice: StripeInvoice; pdfUrl?: string }> {
    if (invoice.invoice_pdf) {
      return { invoice, pdfUrl: invoice.invoice_pdf };
    }

    let workingInvoice = invoice;

    if (invoice.status === 'draft') {
      try {
        workingInvoice = await this.stripe.client.invoices.finalize(invoice.id);
      } catch (error) {
        this.logger.warn(`Unable to finalize invoice ${invoice.id}: ${(error as Error).message}`);
      }
    }

    if (!workingInvoice.invoice_pdf) {
      try {
        workingInvoice = await this.stripe.client.invoices.retrieve(invoice.id);
      } catch (error) {
        this.logger.warn(`Unable to retrieve invoice ${invoice.id} for PDF: ${(error as Error).message}`);
      }
    }

    const pdfUrl = workingInvoice.invoice_pdf ?? workingInvoice.hosted_invoice_url ?? invoice.hosted_invoice_url ?? undefined;

    return { invoice: workingInvoice, pdfUrl };
  }

  private resolveLegalMention(invoice: StripeInvoice): string | undefined {
    const totalTax = invoice.total_tax_amounts?.reduce((sum, taxAmount) => sum + (taxAmount.amount ?? 0), 0) ?? 0;
    if (totalTax === 0) {
      if (invoice.customer_tax_exempt === 'reverse' || invoice.customer_tax_ids?.some(id => id.type === 'eu_vat')) {
        return 'Autoliquidation de la TVA – article 283-2 du CGI';
      }
      return 'TVA non applicable – art. 293 B CGI';
    }
    return undefined;
  }

  private buildFooter(legalMention?: string): string {
    const base = this.config.get<string>('BILLING_INVOICE_FOOTER') ?? '';
    const segments = [base.trim(), legalMention?.trim() ?? ''].filter(Boolean);
    return segments.join('\n');
  }

  private async ensureStripeFooter(invoice: StripeInvoice, footer: string): Promise<void> {
    if (!footer || invoice.footer === footer) return;
    try {
      await this.stripe.client.invoices.update(invoice.id, { footer });
    } catch (error) {
      this.logger.warn(`Unable to update invoice footer for ${invoice.id}: ${(error as Error).message}`);
    }
  }

  private async ensureInvoiceNumber(tx: Prisma.TransactionClient, invoice: StripeInvoice): Promise<string> {
    if (invoice.number && this.isLegalNumber(invoice.number)) {
      await this.syncSequence(tx, invoice.number);
      return invoice.number;
    }
    return this.generateNumber(tx, invoice.created ? new Date(invoice.created * 1000) : new Date());
  }

  private isLegalNumber(number: string): boolean {
    return /^\d{4}-\d{6}$/.test(number);
  }

  private async syncSequence(tx: Prisma.TransactionClient, number: string): Promise<void> {
    const [yearStr, counterStr] = number.split('-');
    const year = parseInt(yearStr, 10);
    const counter = parseInt(counterStr, 10);
    if (!Number.isFinite(year) || !Number.isFinite(counter)) return;

    const current = await tx.billing_invoice_sequences.findUnique({ where: { year } });
    if (!current || current.last_value < counter) {
      await tx.billing_invoice_sequences.upsert({
        where: { year },
        create: { year, last_value: counter },
        update: { last_value: counter, updated_at: new Date() },
      });
    }
  }

  private async generateNumber(tx: Prisma.TransactionClient, issuedAt: Date): Promise<string> {
    const year = issuedAt.getUTCFullYear();
    const sequence = await tx.billing_invoice_sequences.upsert({
      where: { year },
      create: { year, last_value: 1 },
      update: { last_value: { increment: 1 }, updated_at: new Date() },
    });
    const counter = sequence.last_value;
    return `${year}-${String(counter).padStart(6, '0')}`;
  }

  private mapInvoiceStatus(status: string | null | undefined): invoice_status {
    switch (status) {
      case 'draft':
        return invoice_status.draft;
      case 'open':
      case 'uncollectible':
        return invoice_status.open;
      case 'void':
        return invoice_status.void;
      case 'paid':
        return invoice_status.paid;
      default:
        return invoice_status.open;
    }
  }
}

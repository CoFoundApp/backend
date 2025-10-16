import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { URLSearchParams } from 'node:url';
import { StripeCharge, StripeCheckoutSession, StripeCustomer, StripeEvent, StripeInvoice, StripePaymentIntent, StripeSubscription } from './stripe.types';

type HttpMethod = 'GET' | 'POST';

class StripeHttpClient {
  private readonly baseUrl = 'https://api.stripe.com/v1';
  private readonly headers: Record<string, string>;

  constructor(private readonly apiKey: string) {
    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      'User-Agent': 'cofound-stripe-client/1.0',
    };
  }

  checkout = {
    sessions: {
      create: (params: Record<string, any>) => this.request<StripeCheckoutSession>('POST', 'checkout/sessions', params),
    },
  };

  billingPortal = {
    sessions: {
      create: (params: Record<string, any>) => this.request<{ url: string }>('POST', 'billing_portal/sessions', params),
    },
  };

  customers = {
    create: (params: Record<string, any>) => this.request<StripeCustomer>('POST', 'customers', params),
    retrieve: (id: string, params?: Record<string, any>) => this.request<StripeCustomer>('GET', `customers/${id}`, params),
  };

  subscriptions = {
    retrieve: (id: string, params?: Record<string, any>) => this.request<StripeSubscription>('GET', `subscriptions/${id}`, params),
    list: (params?: Record<string, any>) => this.request<{ data: StripeSubscription[] }>('GET', 'subscriptions', params),
    update: (id: string, params: Record<string, any>) => this.request<StripeSubscription>('POST', `subscriptions/${id}`, params),
  };

  paymentIntents = {
    retrieve: (id: string, params?: Record<string, any>) => this.request<StripePaymentIntent>('GET', `payment_intents/${id}`, params),
  };

  invoices = {
    update: (id: string, params: Record<string, any>) => this.request<StripeInvoice>('POST', `invoices/${id}`, params),
    list: (params?: Record<string, any>) => this.request<{ data: StripeInvoice[] }>('GET', 'invoices', params),
    retrieve: (id: string, params?: Record<string, any>) => this.request<StripeInvoice>('GET', `invoices/${id}`, params),
    finalize: (id: string, params?: Record<string, any>) => this.request<StripeInvoice>('POST', `invoices/${id}/finalize`, params),
  };

  private async request<T>(method: HttpMethod, path: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}/${path}`);
    const options: RequestInit = { method };

    if (method === 'GET') {
      if (params) {
        this.appendQuery(url, params);
      }
    } else {
      const body = params ? this.buildForm(params) : new URLSearchParams();
      options.body = body.toString();
      options.headers = { ...this.headers, 'Content-Type': 'application/x-www-form-urlencoded' };
    }

    if (!options.headers) {
      options.headers = { ...this.headers };
    }

    const response = await fetch(url, options);
    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message ?? `Stripe API error ${response.status}`;
      throw new Error(message);
    }
    return payload as T;
  }

  private appendQuery(url: URL, params: Record<string, any>, prefix?: string) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const paramKey = prefix ? `${prefix}[${key}]` : key;
      if (Array.isArray(value)) {
        value.forEach((entry, index) => this.appendQuery(url, { [index]: entry }, paramKey));
      } else if (typeof value === 'object') {
        this.appendQuery(url, value, paramKey);
      } else {
        url.searchParams.append(paramKey, String(value));
      }
    });
  }

  private buildForm(params: Record<string, any>): URLSearchParams {
    const form = new URLSearchParams();
    this.flatten(form, params);
    return form;
  }

  private flatten(form: URLSearchParams, value: any, prefix?: string) {
    if (value === undefined || value === null) {
      if (prefix) form.append(prefix, '');
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry, index) => {
        const key = prefix ? `${prefix}[${index}]` : String(index);
        this.flatten(form, entry, key);
      });
      return;
    }
    if (typeof value === 'object') {
      Object.entries(value).forEach(([key, entry]) => {
        const composite = prefix ? `${prefix}[${key}]` : key;
        this.flatten(form, entry, composite);
      });
      return;
    }
    if (!prefix) throw new Error('Missing key for Stripe form encoding');
    form.append(prefix, String(value));
  }
}

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly apiKey: string;
  private readonly webhookSecret: string;
  public readonly client: StripeHttpClient;

  constructor(private readonly config: ConfigService) {
    this.apiKey = this.config.get<string>('STRIPE_SECRET_KEY') ?? '';
    if (!this.apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';
    this.client = new StripeHttpClient(this.apiKey);
  }

  constructWebhookEvent(body: Buffer | string, signature: string | string[] | undefined): StripeEvent {
    if (!signature || Array.isArray(signature)) {
      throw new Error('Invalid Stripe signature header');
    }
    const payload = typeof body === 'string' ? body : body.toString('utf8');
    const parts = signature.split(',');
    const timestampPart = parts.find(part => part.startsWith('t='));
    const signaturePart = parts.find(part => part.startsWith('v1='));
    if (!timestampPart || !signaturePart) {
      throw new Error('Malformed Stripe signature header');
    }
    const timestamp = timestampPart.split('=')[1];
    const expected = createHmac('sha256', this.webhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest();
    const received = Buffer.from(signaturePart.split('=')[1], 'hex');
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
      throw new Error('Invalid Stripe signature');
    }
    return JSON.parse(payload) as StripeEvent;
  }
}

export type {
  StripeCheckoutSession,
  StripeSubscription,
  StripeInvoice,
  StripePaymentIntent,
  StripeCharge,
  StripeCustomer,
  StripeEvent,
};

export {};

declare module '@prisma/client' {
  type AnyRecord = Record<string, any>;

  export type invoice_status = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  export const invoice_status: {
    draft: 'draft';
    open: 'open';
    paid: 'paid';
    void: 'void';
    uncollectible: 'uncollectible';
  };

  export type payment_status =
    | 'requires_payment_method'
    | 'requires_action'
    | 'processing'
    | 'succeeded'
    | 'canceled';
  export const payment_status: {
    requires_payment_method: 'requires_payment_method';
    requires_action: 'requires_action';
    processing: 'processing';
    succeeded: 'succeeded';
    canceled: 'canceled';
  };

  export type subscription_collection_method = 'charge_automatically' | 'send_invoice';
  export const subscription_collection_method: {
    charge_automatically: 'charge_automatically';
    send_invoice: 'send_invoice';
  };

  export type subscription_status = 'trialing' | 'active' | 'past_due' | 'canceled';
  export const subscription_status: {
    trialing: 'trialing';
    active: 'active';
    past_due: 'past_due';
    canceled: 'canceled';
  };

  export type plan_interval = 'month' | 'year';
  export const plan_interval: {
    month: 'month';
    year: 'year';
  };

  export interface billing_invoice_sequences extends AnyRecord {
    id: number;
    year: number;
    last_value: number;
    updated_at: Date;
    [key: string]: any;
  }

  export interface billing_events extends AnyRecord {
    id: string;
    stripe_event_id: string;
    type: string;
    payload: AnyRecord;
    processed: boolean;
    processed_at: Date | null;
    error_message: string | null;
    created_at: Date;
    updated_at: Date;
    [key: string]: any;
  }

  export interface billing_customers extends AnyRecord {
    id: string;
    stripe_customer_id: string;
    email: string;
    name: string | null;
    phone: string | null;
    locale: string | null;
    tax_exemption: string | null;
    vat_number: string | null;
    vat_valid: boolean;
    billing_address: AnyRecord | null;
    shipping_address: AnyRecord | null;
    metadata: AnyRecord | null;
    user_id: string | null;
    organization_id: string | null;
    created_at: Date;
    updated_at: Date;
    [key: string]: any;
  }

  export interface subscriptions extends AnyRecord {
    id: string;
    user_id: string | null;
    organization_id: string | null;
    billing_customer_id: string | null;
    plan_id: string | null;
    plan_code: string;
    billing_interval: plan_interval;
    status: subscription_status;
    collection_method: subscription_collection_method;
    seats: number | null;
    external_subscription_id: string | null;
    external_customer_id: string | null;
    trial_start: Date | null;
    trial_end: Date | null;
    cancel_at: Date | null;
    canceled_at: Date | null;
    ended_reason: string | null;
    created_at: Date;
    updated_at: Date;
    [key: string]: any;
  }

  export interface billing_payments extends AnyRecord {
    id: string;
    invoice_id: string | null;
    billing_customer_id: string;
    amount_cents: number;
    currency: string;
    status: payment_status;
    external_payment_id: string | null;
    metadata: AnyRecord | null;
    created_at: Date;
    updated_at: Date;
    [key: string]: any;
  }

  export interface plans extends AnyRecord {
    id: string;
    code: string;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
    [key: string]: any;
  }

  export interface entitlements extends AnyRecord {
    id: string;
    subscription_id: string;
    feature: string;
    limit: number | null;
    value: AnyRecord | null;
    created_at: Date;
    updated_at: Date;
    [key: string]: any;
  }

  export interface invoices extends AnyRecord {
    id: string;
    subscription_id: string;
    billing_customer_id: string | null;
    amount_cents: number;
    currency: string;
    status: invoice_status;
    issued_at: Date;
    due_at: Date | null;
    paid_at: Date | null;
    external_invoice_id: string | null;
    pdf_url: string | null;
    stripe_invoice_id: string | null;
    number: string | null;
    subtotal_cents: number | null;
    tax_amount_cents: number | null;
    tax_rate_percent: any;
    total_cents: number | null;
    footer: string | null;
    legal_mention: string | null;
    [key: string]: any;
  }

  interface PrismaDelegate<T = AnyRecord> {
    findMany(args?: any): Promise<T[]>;
    findUnique(args?: any): Promise<T | null>;
    findFirst(args?: any): Promise<T | null>;
    create(args?: any): Promise<T>;
    createMany(args?: any): Promise<{ count: number }>;
    update(args?: any): Promise<T>;
    updateMany(args?: any): Promise<{ count: number }>;
    upsert(args?: any): Promise<T>;
    delete(args?: any): Promise<T>;
    deleteMany(args?: any): Promise<{ count: number }>;
    count(args?: any): Promise<number>;
    aggregate?(args?: any): Promise<any>;
    [method: string]: any;
  }

  export class PrismaClient {
    constructor(options?: any);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
    $executeRaw(...args: any[]): Promise<unknown>;
    $executeRawUnsafe(...args: any[]): Promise<unknown>;
    $queryRaw<T = unknown>(...args: any[]): Promise<T>;
    $queryRawUnsafe<T = unknown>(...args: any[]): Promise<T>;
    [delegate: string]: any;
  }

  export namespace Prisma {
    class Decimal {
      constructor(value: string | number | Decimal);
      toNumber(): number;
      toString(): string;
      valueOf(): string;
    }

    type JsonValue = any;
    type JsonObject = Record<string, any>;
    type JsonArray = any[];

    const JsonNull: null;

    type billing_customersGetPayload<T = AnyRecord> = billing_customers & AnyRecord;

    interface TransactionClient extends PrismaClient {}

    type invoicesWhereUniqueInput = Record<string, any>;
    type invoicesUncheckedUpdateInput = Record<string, any>;
    type invoicesUncheckedCreateInput = Record<string, any>;
  }

  export const Prisma: {
    Decimal: typeof Prisma.Decimal;
    JsonNull: null;
    [key: string]: unknown;
  };
}

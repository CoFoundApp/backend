export interface StripeCheckoutSession {
  id: string;
  url?: string | null;
  customer?: string | { id: string } | null;
  subscription?: string | StripeSubscription | null;
  metadata?: Record<string, string> | null;
}

export interface StripeSubscription {
  id: string;
  status: string;
  customer: string | { id: string };
  metadata?: Record<string, string> | null;
  items: { data: Array<{ price: StripePrice; quantity?: number | null }> };
  collection_method?: string | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at?: number | null;
  canceled_at?: number | null;
  trial_start?: number | null;
  trial_end?: number | null;
  billing_cycle_anchor?: number | null;
  default_payment_method?: string | { id: string } | null;
  cancellation_details?: {
    comment?: string | null;
    feedback?: string | null;
    reason?: string | null;
  } | null;
}

export interface StripePrice {
  id: string;
  recurring?: { interval: 'day' | 'week' | 'month' | 'year' } | null;
}

export interface StripeInvoice {
  id: string;
  status?: string | null;
  subscription?: string | StripeSubscription | null;
  customer?: string | { id: string } | null;
  amount_due?: number | null;
  amount_subtotal?: number | null;
  amount_paid?: number | null;
  total?: number | null;
  subtotal?: number | null;
  tax?: number | null;
  total_tax_amounts?: Array<{ amount: number; rate?: { percentage?: number | null } | null }> | null;
  number?: string | null;
  invoice_pdf?: string | null;
  hosted_invoice_url?: string | null;
  footer?: string | null;
  created?: number | null;
  due_date?: number | null;
  status_transitions?: { paid_at?: number | null } | null;
  payment_intent?: string | StripePaymentIntent | null;
  customer_tax_exempt?: string | null;
  customer_tax_ids?: Array<{ type?: string | null; value?: string | null }> | null;
  customer_email?: string | null;
  customer_name?: string | null;
  currency?: string | null;
  paid?: boolean | null;
}

export interface StripePaymentIntent {
  id: string;
  status?: string | null;
  amount?: number | null;
  amount_received?: number | null;
  currency?: string | null;
  customer?: string | null;
  invoice?: string | null;
  payment_method_types?: string[] | null;
  charges?: {
    data?: Array<{
      receipt_url?: string | null;
      payment_method_details?: {
        type?: string | null;
        card?: { brand?: string | null; last4?: string | null } | null;
        sepa_debit?: { last4?: string | null } | null;
      } | null;
    }>;
  } | null;
}

export interface StripeCharge {
  id: string;
  payment_intent?: string | null;
}

export interface StripeCustomer {
  id: string;
  email?: string | null;
  name?: string | null;
  phone?: string | null;
  preferred_locales?: string[] | null;
  tax_exempt?: string | null;
  tax_ids?: { data?: Array<{ type?: string | null; value?: string | null; verification?: { status?: string | null } | null }> } | null;
  address?: any;
  shipping?: { address?: any } | null;
  metadata?: Record<string, string> | null;
}

export interface StripeEvent {
  id: string;
  type: string;
  data: { object: any };
}

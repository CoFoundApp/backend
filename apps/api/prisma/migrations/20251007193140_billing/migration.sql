/*
  Warnings:

  - A unique constraint covering the columns `[stripe_invoice_id]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `plan_code` to the `subscriptions` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "public"."payment_status" AS ENUM ('requires_payment_method', 'requires_action', 'processing', 'succeeded', 'canceled');

-- CreateEnum
CREATE TYPE "public"."subscription_collection_method" AS ENUM ('charge_automatically', 'send_invoice');

-- AlterTable
ALTER TABLE "public"."invoices" ADD COLUMN     "billing_customer_id" UUID,
ADD COLUMN     "footer" TEXT,
ADD COLUMN     "legal_mention" TEXT,
ADD COLUMN     "number" CITEXT,
ADD COLUMN     "stripe_invoice_id" TEXT,
ADD COLUMN     "subtotal_cents" INTEGER,
ADD COLUMN     "tax_amount_cents" INTEGER,
ADD COLUMN     "tax_rate_percent" DECIMAL(5,2),
ADD COLUMN     "total_cents" INTEGER;

-- AlterTable
ALTER TABLE "public"."subscriptions" ADD COLUMN     "billing_customer_id" UUID,
ADD COLUMN     "billing_cycle_anchor" TIMESTAMPTZ(6),
ADD COLUMN     "billing_interval" "public"."plan_interval" NOT NULL DEFAULT 'month',
ADD COLUMN     "collection_method" "public"."subscription_collection_method" NOT NULL DEFAULT 'charge_automatically',
ADD COLUMN     "default_payment_method_id" TEXT,
ADD COLUMN     "ended_reason" TEXT,
ADD COLUMN     "organization_id" UUID,
ADD COLUMN     "plan_code" CITEXT NOT NULL,
ADD COLUMN     "trial_end" TIMESTAMPTZ(6),
ADD COLUMN     "trial_start" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "public"."organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "legal_name" TEXT NOT NULL,
    "legal_form" TEXT NOT NULL DEFAULT 'SAS',
    "siren" TEXT,
    "siret" TEXT,
    "rcs" TEXT,
    "vat_number" TEXT,
    "address" JSONB,
    "billing_email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "owner_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID,
    "user_id" UUID,
    "stripe_customer_id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "locale" TEXT DEFAULT 'fr',
    "tax_exemption" CITEXT,
    "vat_number" TEXT,
    "vat_valid" BOOLEAN NOT NULL DEFAULT false,
    "billing_address" JSONB,
    "shipping_address" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "billing_customer_id" UUID NOT NULL,
    "invoice_id" UUID,
    "stripe_payment_intent_id" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'EUR',
    "status" "public"."payment_status" NOT NULL DEFAULT 'succeeded',
    "payment_method_type" TEXT,
    "receipt_url" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "stripe_event_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "error_message" TEXT,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_invoice_sequences" (
    "id" SERIAL NOT NULL,
    "year" INTEGER NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_invoice_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_organizations_owner" ON "public"."organizations"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_customers_stripe_customer_id_key" ON "public"."billing_customers"("stripe_customer_id");

-- CreateIndex
CREATE INDEX "idx_billing_customer_org" ON "public"."billing_customers"("organization_id");

-- CreateIndex
CREATE INDEX "idx_billing_customer_user" ON "public"."billing_customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_payments_stripe_payment_intent_id_key" ON "public"."billing_payments"("stripe_payment_intent_id");

-- CreateIndex
CREATE INDEX "idx_billing_payments_invoice" ON "public"."billing_payments"("invoice_id");

-- CreateIndex
CREATE INDEX "idx_billing_payments_customer" ON "public"."billing_payments"("billing_customer_id", "processed_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_events_stripe_event_id_key" ON "public"."billing_events"("stripe_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_invoice_sequence_year" ON "public"."billing_invoice_sequences"("year");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_stripe_invoice_id_key" ON "public"."invoices"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "idx_invoices_billing_customer" ON "public"."invoices"("billing_customer_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_org" ON "public"."subscriptions"("organization_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_billing_customer" ON "public"."subscriptions"("billing_customer_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_plan_code" ON "public"."subscriptions"("plan_code");

-- AddForeignKey
ALTER TABLE "public"."invoices" ADD CONSTRAINT "invoices_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."organizations" ADD CONSTRAINT "organizations_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_customers" ADD CONSTRAINT "billing_customers_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_customers" ADD CONSTRAINT "billing_customers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_payments" ADD CONSTRAINT "billing_payments_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_customers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."billing_payments" ADD CONSTRAINT "billing_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."subscriptions" ADD CONSTRAINT "subscriptions_billing_customer_id_fkey" FOREIGN KEY ("billing_customer_id") REFERENCES "public"."billing_customers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BillingAdminService } from './billing-admin.service';
import { BillingAdminCustomerType, BillingAdminInvoiceSequenceResultType } from './billing-admin.graphql-types';
import { SessionGuard } from '../../auth/guards/session.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Resolver()
@UseGuards(SessionGuard, RolesGuard)
@Roles('admin')
export class BillingAdminResolver {
  constructor(private readonly admin: BillingAdminService) {}

  @Query(() => [BillingAdminCustomerType], {
    description: 'Liste des clients Stripe connus côté admin.',
  })
  async billingAdminCustomers(): Promise<BillingAdminCustomerType[]> {
    const customers = await this.admin.listCustomers();
    return customers ?? [];
  }

  @Mutation(() => BillingAdminCustomerType, {
    nullable: true,
    description: 'Force la synchronisation d’un client Stripe côté admin.',
  })
  async billingAdminForceSyncCustomer(
    @Args('stripeCustomerId', { type: () => String }) stripeCustomerId: string,
  ): Promise<BillingAdminCustomerType | null> {
    return this.admin.forceSyncCustomer(stripeCustomerId);
  }

  @Mutation(() => Boolean, {
    description: 'Met à jour une entitlement manuelle sur une souscription.',
  })
  async billingAdminUpdateEntitlement(
    @Args('subscriptionId', { type: () => String }) subscriptionId: string,
    @Args('featureCode', { type: () => String }) featureCode: string,
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<boolean> {
    await this.admin.updateEntitlement(subscriptionId, featureCode, limit ?? null);
    return true;
  }

  @Mutation(() => BillingAdminInvoiceSequenceResultType, {
    description: 'Regénère la séquence de factures pour une année donnée.',
  })
  async billingAdminRegenerateInvoiceSequence(
    @Args('year', { type: () => Int }) year: number,
  ): Promise<BillingAdminInvoiceSequenceResultType> {
    return this.admin.regenerateInvoiceSequence(year);
  }
}

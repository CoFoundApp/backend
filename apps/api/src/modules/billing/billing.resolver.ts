import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { BillingService } from './billing.service';
import {
  BillingPlanPublicType,
  BillingCheckoutSessionType,
  BillingPortalSessionType,
  BillingCheckoutMode,
  BillingSubscriptionSummaryType,
  BillingHistoryType,
} from './billing.graphql-types';
import { CreateCheckoutSessionInput } from './dto/create-checkout-session.input';
import { CustomerPortalSessionInput } from './dto/customer-portal-session.input';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { BillingInterval, BillingPlanCode } from './billing.types';

@Resolver()
export class BillingResolver {
  constructor(private readonly billing: BillingService) {}

  @Query(() => [BillingPlanPublicType], {
    description: 'Catalogue public des plans d’abonnement disponibles.',
  })
  billingCatalog() {
    return this.billing.getPublicCatalog();
  }

  @UseGuards(SessionGuard)
  @Mutation(() => BillingCheckoutSessionType, {
    description: 'Crée une session de paiement Stripe ou active un plan gratuit.',
  })
  async createBillingCheckoutSession(
    @CurrentUser() user: JwtUser,
    @Args('input') input: CreateCheckoutSessionInput,
  ): Promise<BillingCheckoutSessionType> {
    if (!user) {
      throw new UnauthorizedException();
    }

    const session = await this.billing.createCheckoutSession(user.sub, input);

    return {
      mode: session.mode === 'immediate' ? BillingCheckoutMode.IMMEDIATE : BillingCheckoutMode.STRIPE_CHECKOUT,
      sessionId: session.sessionId ?? null,
      url: session.url ?? null,
      subscriptionId: session.subscriptionId ?? null,
    };
  }

  @UseGuards(SessionGuard)
  @Mutation(() => BillingPortalSessionType, {
    description: 'Crée une session vers le portail client Stripe pour gérer son abonnement.',
  })
  async createBillingPortalSession(
    @CurrentUser() user: JwtUser,
    @Args('input') input: CustomerPortalSessionInput,
  ): Promise<BillingPortalSessionType> {
    if (!user) {
      throw new UnauthorizedException();
    }

    const session = await this.billing.createCustomerPortalSession(user.sub, input);
    return { url: session.url };
  }

  @UseGuards(SessionGuard)
  @Query(() => BillingSubscriptionSummaryType, {
    nullable: true,
    description: 'Retourne la dernière souscription associée à l’utilisateur authentifié.',
  })
  async myBillingSubscription(@CurrentUser() user: JwtUser): Promise<BillingSubscriptionSummaryType | null> {
    if (!user) {
      throw new UnauthorizedException();
    }

    const subscription = await this.billing.getLatestSubscriptionForUser(user.sub);
    if (!subscription) {
      return null;
    }

    return {
      id: subscription.id,
      planCode: subscription.plan_code as BillingPlanCode,
      interval: subscription.billing_interval as BillingInterval,
      status: subscription.status,
      stripeSubscriptionId: subscription.external_subscription_id ?? null,
      currentPeriodEnd: subscription.current_period_end ?? null,
    };
  }

  @UseGuards(SessionGuard)
  @Query(() => BillingHistoryType, {
    description: 'Historique des factures et paiements de l’utilisateur authentifié.',
  })
  async myBillingHistory(@CurrentUser() user: JwtUser): Promise<BillingHistoryType> {
    if (!user) {
      throw new UnauthorizedException();
    }

    return this.billing.getBillingHistoryForUser(user.sub);
  }
}

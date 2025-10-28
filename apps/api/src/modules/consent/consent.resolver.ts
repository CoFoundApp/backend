import { Args, Context, Int, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { ConsentService } from './consent.service';
import { SetConsentInput } from './dto/consent.dto';
import { ConsentCurrent, ConsentRecord } from './consent.types';
import { AppError } from '../../common/errors/app-error.factory';

@Resolver()
export class ConsentResolver {
  constructor(private readonly consents: ConsentService) {}

  @UseGuards(SessionGuard)
  @Mutation(() => ConsentRecord, { description: 'Créer un enregistrement de consentement (historisé)' })
  async setMyConsent(
    @CurrentUser() user: JwtUser,
    @Args('input') input: SetConsentInput,
    @Context() ctx: any,
  ) {
    const req = ctx?.req;
    const ip =
      (req?.headers?.['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      null;
    const userAgent = (req?.headers?.['user-agent'] as string | undefined) ?? null;

    return this.consents.setConsent({
      userId: user.sub,
      consent_type: input.consent_type,
      granted: input.granted,
      ip,
      userAgent,
      metadataJson: input.metadataJson ?? null,
    });
  }

  @UseGuards(SessionGuard)
  @Query(() => [ConsentCurrent], { description: 'État courant de mes consentements (dernier par type)' })
  async myCurrentConsents(@CurrentUser() user: JwtUser) {
    return this.consents.getCurrentConsents(user.sub);
  }

  @UseGuards(SessionGuard)
  @Query(() => [ConsentRecord], { description: 'Historique de mes consentements (optionnellement par type)' })
  async myConsentHistory(
    @CurrentUser() user: JwtUser,
    @Args('consent_type', { type: () => String, nullable: true }) consent_type?: string,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 50 }) limit?: number,
  ) {
    if (!user) {
      throw AppError.unauthorized('user.missing.in.context');
    }
    return this.consents.getHistory(user.sub, consent_type ?? null, limit ?? 50);
  }

}

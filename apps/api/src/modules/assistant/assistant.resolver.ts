import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';

import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser, JwtUser } from '../auth/current-user.decorator';
import { ProjectIdeationAssistantPayload, ProjectIdeationAssistantSavedRun } from './assistant.types';
import { ProjectIdeationAssistantInput } from './dto/project-ideation.input';
import { AssistantService } from './assistant.service';
import { AppError } from '../../common/errors/app-error.factory';
import { Role } from '../auth/role.enum';

@Resolver()
export class AssistantResolver {
  private user: { sub: string; role: string };

  constructor(private readonly assistant: AssistantService) {
    this.user = {
      sub: '28219d40-326e-4f94-a242-27cc62ac6842',
      role: 'ADMIN',
    };
  }

  // @UseGuards(SessionGuard)
  @Mutation(() => ProjectIdeationAssistantPayload, {
    description: 'Génère la fiche Projet & Idéation (4 piliers + livrables)',
  })
  async runProjectIdeationAssistant(
    @Args('input', { type: () => ProjectIdeationAssistantInput }) input: ProjectIdeationAssistantInput,
  ) {
    if (!this.user) throw AppError.unauthorized();
    return this.assistant.generateProjectIdeation(this.user.sub, input, this.user.role as Role);
  }

  // @UseGuards(SessionGuard)
  @Query(() => [ProjectIdeationAssistantSavedRun], {
    description: 'Historique des sauvegardes Projet & Idéation pour reprendre plus tard',
  })
  async projectIdeationAssistantHistory() {
    if (!this.user) throw AppError.unauthorized();
    return this.assistant.listProjectIdeationRuns(this.user.sub, this.user.role as Role);
  }

  // @UseGuards(SessionGuard)
  @Query(() => ProjectIdeationAssistantSavedRun, {
    nullable: true,
    description: 'Détail d’une sauvegarde Projet & Idéation donnée',
  })
  async projectIdeationAssistantRun(
    @Args('id', { type: () => String }) id: string,
    // @CurrentUser() user: JwtUser,
  ) {
    if (!this.user) throw AppError.unauthorized();
    return this.assistant.getProjectIdeationRun(this.user.sub, id, this.user.role as Role);
  }
}

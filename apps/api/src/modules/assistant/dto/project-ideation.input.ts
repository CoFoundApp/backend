import { Field, InputType } from '@nestjs/graphql';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ProjectIdeationAssistantStep } from '../assistant.types';
import { AssistantConversationMessage } from '../assistant.types';

@InputType()
export class AssistantConversationMessageInput implements AssistantConversationMessage {
  @Field(() => String, { description: 'Rôle du message dans la conversation (user ou assistant)' })
  @IsEnum(['assistant', 'user'])
  role!: 'assistant' | 'user';

  @Field(() => String, { description: 'Texte brut du tour de conversation' })
  @IsString()
  content!: string;
}

@InputType()
export class ProjectIdeationAssistantInput {
  @Field(() => String, { description: "Description libre de l'idée initiale" })
  @IsString()
  idea!: string;

  @Field(() => String, { nullable: true, description: 'Contexte ou situation de départ' })
  @IsOptional()
  @IsString()
  context?: string;

  @Field(() => String, { nullable: true, description: 'Motivation personnelle ou objectif derrière le projet' })
  @IsOptional()
  @IsString()
  motivation?: string;

  @Field(() => String, { nullable: true, description: 'Problème principal que le projet cherche à résoudre' })
  @IsOptional()
  @IsString()
  problem?: string;

  @Field(() => String, { nullable: true, description: 'Public ou segment pressenti' })
  @IsOptional()
  @IsString()
  targetAudience?: string;

  @Field(() => String, { nullable: true, description: "Stade d'avancement (idée, prototype, premiers clients...)" })
  @IsOptional()
  @IsString()
  stage?: string;

  @Field(() => String, { nullable: true, description: 'Contraintes majeures (temps, budget, compétences)' })
  @IsOptional()
  @IsString()
  constraints?: string;

  @Field(() => String, { nullable: true, description: 'Ressources disponibles (temps, réseau, outils)' })
  @IsOptional()
  @IsString()
  resources?: string;

  @Field(() => String, { nullable: true, description: 'Différenciation pressentie ou avantage compétitif' })
  @IsOptional()
  @IsString()
  differentiator?: string;

  @Field(() => String, { nullable: true, description: 'Critère de succès ou indicateur recherché' })
  @IsOptional()
  @IsString()
  successMetric?: string;

  @Field(() => String, { nullable: true, description: 'Forcer la langue (fr ou en) sinon auto-détection' })
  @IsOptional()
  @IsString()
  language?: string;

  @Field(() => ProjectIdeationAssistantStep, {
    nullable: true,
    description:
      'Piliers à générer. Par défaut: Exploration pour avancer étape par étape (ALL reste disponible pour tout générer).',
    defaultValue: ProjectIdeationAssistantStep.Exploration,
  })
  @IsOptional()
  @IsEnum(ProjectIdeationAssistantStep)
  step?: ProjectIdeationAssistantStep;

  @Field(() => [AssistantConversationMessageInput], {
    nullable: true,
    description:
      'Historique des échanges utilisateur/assistant pour garder le contexte et poser les prochaines questions dans l’ordre',
  })
  @IsOptional()
  conversationHistory?: AssistantConversationMessageInput[];
}

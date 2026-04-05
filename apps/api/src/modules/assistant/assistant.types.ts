import {
  Field,
  GraphQLISODateTime,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql';
import {
  IsArray,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ProjectIdeationAssistantStep {
  Exploration = 'EXPLORATION',
  Structuration = 'STRUCTURATION',
  Action = 'ACTION',
  Documentation = 'DOCUMENTATION',
  Orientation = 'ORIENTATION',
  All = 'ALL',
}

export const PROJECT_IDEATION_ASSISTANT_STEPS: ProjectIdeationAssistantStep[] = [
  ProjectIdeationAssistantStep.Exploration,
  ProjectIdeationAssistantStep.Structuration,
  ProjectIdeationAssistantStep.Action,
  ProjectIdeationAssistantStep.Documentation,
  ProjectIdeationAssistantStep.Orientation,
];

registerEnumType(ProjectIdeationAssistantStep, {
  name: 'ProjectIdeationAssistantStep',
  description:
    'Détermine le pilier à générer : Exploration, Structuration, Action, Documentation, Orientation ou bien tout le parcours.',
});

@ObjectType()
export class AssistantConversationMessage {
  @Field(() => String, { description: 'Rôle de la personne qui parle (assistant ou utilisateur)' })
  @IsString()
  @IsEnum(['assistant', 'user'])
  role!: 'assistant' | 'user';

  @Field(() => String, { description: 'Contenu brut du message' })
  @IsString()
  content!: string;
}

/**
 * ECHO de l’input dans le payload
 */
@ObjectType()
export class ProjectIdeationAssistantInputEcho {
  @Field(() => String)
  @IsString()
  idea!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  context?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  motivation?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  problem?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  targetAudience?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  stage?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  constraints?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  resources?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  differentiator?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  successMetric?: string | null;
}

@ObjectType()
export class ProjectIdeationAssistantExploration {
  @Field(() => String)
  @IsString()
  vision!: string;

  @Field(() => String)
  @IsString()
  context!: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  problems!: string[];

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  keywords!: string[];

  @Field(() => String)
  @IsString()
  audience!: string;
}

@ObjectType()
export class AssistantMiniCanvas {
  @Field(() => String)
  @IsString()
  problem!: string;

  @Field(() => String)
  @IsString()
  solution!: string;

  @Field(() => String)
  @IsString()
  target!: string;

  @Field(() => String)
  @IsString()
  value!: string;

  @Field(() => String)
  @IsString()
  differentiation!: string;
}

@ObjectType()
export class AssistantPersona {
  @Field(() => String)
  @IsString()
  name!: string;

  @Field(() => String)
  @IsString()
  description!: string;

  @Field(() => String)
  @IsString()
  objective!: string;

  @Field(() => String)
  @IsString()
  needs!: string;

  @Field(() => String)
  @IsString()
  pains!: string;

  @Field(() => String)
  @IsString()
  behaviors!: string;
}

@ObjectType()
export class AssistantHypothesis {
  @Field(() => String)
  @IsString()
  statement!: string;

  @Field(() => String)
  @IsString()
  validation!: string;
}

@ObjectType()
export class ProjectIdeationAssistantStructuration {
  @Field(() => AssistantMiniCanvas)
  @ValidateNested()
  @Type(() => AssistantMiniCanvas)
  miniCanvas!: AssistantMiniCanvas;

  @Field(() => AssistantPersona)
  @ValidateNested()
  @Type(() => AssistantPersona)
  persona!: AssistantPersona;

  @Field(() => [AssistantHypothesis])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantHypothesis)
  hypotheses!: AssistantHypothesis[];

  @Field(() => String)
  @IsString()
  valueProposition!: string;

  @Field(() => String)
  @IsString()
  pitch!: string;
}

@ObjectType()
export class AssistantActionItem {
  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => String)
  @IsString()
  description!: string;

  @Field(() => String)
  @IsString()
  duration!: string;

  @Field(() => String)
  @IsString()
  why!: string;

  @Field(() => String)
  @IsString()
  metric!: string;

  @Field(() => String)
  @IsString()
  effort!: string;
}

@ObjectType()
export class AssistantPlanStep {
  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => String)
  @IsString()
  owner!: string;

  @Field(() => String)
  @IsString()
  approach!: string;

  @Field(() => String)
  @IsString()
  deadline!: string;
}

@ObjectType()
export class AssistantGoal30Days {
  @Field(() => String)
  @IsString()
  statement!: string;

  @Field(() => String)
  @IsString()
  metric!: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  milestones!: string[];
}

@ObjectType()
export class ProjectIdeationAssistantActionBlock {
  @Field(() => [AssistantActionItem])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantActionItem)
  quickActions!: AssistantActionItem[];

  @Field(() => AssistantGoal30Days)
  @ValidateNested()
  @Type(() => AssistantGoal30Days)
  goal30Days!: AssistantGoal30Days;

  @Field(() => [AssistantPlanStep])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantPlanStep)
  actionPlan!: AssistantPlanStep[];

  @Field(() => String)
  @IsString()
  roadmapSummary!: string;
}

@ObjectType()
export class AssistantBusinessModelCanvas {
  @Field(() => String)
  @IsString()
  keyPartners!: string;

  @Field(() => String)
  @IsString()
  keyActivities!: string;

  @Field(() => String)
  @IsString()
  keyResources!: string;

  @Field(() => String)
  @IsString()
  valuePropositions!: string;

  @Field(() => String)
  @IsString()
  customerRelationships!: string;

  @Field(() => String)
  @IsString()
  channels!: string;

  @Field(() => String)
  @IsString()
  customerSegments!: string;

  @Field(() => String)
  @IsString()
  costStructure!: string;

  @Field(() => String)
  @IsString()
  revenueStreams!: string;
}

@ObjectType()
export class AssistantBusinessPlanLight {
  @Field(() => String)
  @IsString()
  executiveSummary!: string;

  @Field(() => String)
  @IsString()
  market!: string;

  @Field(() => String)
  @IsString()
  strategy!: string;

  @Field(() => String)
  @IsString()
  revenueModel!: string;

  @Field(() => String)
  @IsString()
  needs!: string;
}

@ObjectType()
export class AssistantMarketStudy {
  @Field(() => String)
  @IsString()
  trends!: string;

  @Field(() => String)
  @IsString()
  needs!: string;

  @Field(() => String)
  @IsString()
  competitors!: string;

  @Field(() => String)
  @IsString()
  differentiation!: string;
}

@ObjectType()
export class AssistantPitchDeck {
  @Field(() => String)
  @IsString()
  vision!: string;

  @Field(() => String)
  @IsString()
  problem!: string;

  @Field(() => String)
  @IsString()
  solution!: string;

  @Field(() => String)
  @IsString()
  traction!: string;

  @Field(() => String)
  @IsString()
  potential!: string;

  @Field(() => String)
  @IsString()
  callToAction!: string;
}

@ObjectType()
export class AssistantRecap {
  @Field(() => String)
  @IsString()
  headline!: string;

  @Field(() => String)
  @IsString()
  summary!: string;

  @Field(() => String)
  @IsString()
  motivation!: string;
}

@ObjectType()
export class ProjectIdeationAssistantDocumentation {
  @Field(() => AssistantBusinessModelCanvas)
  @ValidateNested()
  @Type(() => AssistantBusinessModelCanvas)
  businessModelCanvas!: AssistantBusinessModelCanvas;

  @Field(() => AssistantBusinessPlanLight)
  @ValidateNested()
  @Type(() => AssistantBusinessPlanLight)
  businessPlan!: AssistantBusinessPlanLight;

  @Field(() => AssistantMarketStudy)
  @ValidateNested()
  @Type(() => AssistantMarketStudy)
  marketStudy!: AssistantMarketStudy;

  @Field(() => AssistantPitchDeck)
  @ValidateNested()
  @Type(() => AssistantPitchDeck)
  pitchDeck!: AssistantPitchDeck;

  @Field(() => AssistantPersona)
  @ValidateNested()
  @Type(() => AssistantPersona)
  personaRecap!: AssistantPersona;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  nextSteps!: string[];

  @Field(() => AssistantRecap)
  @ValidateNested()
  @Type(() => AssistantRecap)
  recap!: AssistantRecap;
}

@ObjectType()
export class AssistantElearningRecommendation {
  @Field(() => String)
  @IsString()
  moduleCode!: string;

  @Field(() => String)
  @IsString()
  title!: string;

  @Field(() => String)
  @IsString()
  description!: string;

  @Field(() => String)
  @IsString()
  url!: string;

  @Field(() => String)
  @IsString()
  reason!: string;
}

@ObjectType()
export class AssistantOrientationBlock {
  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  recommendedSteps!: string[];

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  focusAreas!: string[];
}

@ObjectType()
export class AssistantSegmentInsight {
  @Field(() => String)
  @IsString()
  segment!: string;

  @Field(() => String)
  @IsString()
  painsOrNeeds!: string;

  @Field(() => String)
  @IsString()
  successSignals!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  indicativeSuccessRate?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  confidence?: string | null;
}

@ObjectType()
export class ProjectIdeationAssistantGuidance {
  @Field(() => [String], { description: 'Micro-conseils pour continuer la conversation côté UI' })
  @IsArray()
  @IsString({ each: true })
  nudges!: string[];

  @Field(() => [AssistantSegmentInsight], {
    description: 'Segments proposés avec signaux de réussite et niveau de confiance',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantSegmentInsight)
  segmentInsights!: AssistantSegmentInsight[];

  @Field(() => [String], { description: 'Alertes ou points de vigilance à vérifier' })
  @IsArray()
  @IsString({ each: true })
  riskAlerts!: string[];

  @Field(() => String, {
    nullable: true,
    description: 'Suggestion de prochaine donnée à demander à l’utilisateur (champ ou info clé)',
  })
  @IsOptional()
  @IsString()
  suggestedNextInput?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Estimation qualitative du taux de réussite probable du projet',
  })
  @IsOptional()
  @IsString()
  projectSuccessStats?: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'Lecture synthétique du potentiel de marché (taille, tendance)',
  })
  @IsOptional()
  @IsString()
  marketPotential?: string | null;

  @Field(() => [String], { nullable: true, description: "Idées de nom d'app à proposer" })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  appNameIdeas?: string[] | null;
}

@ObjectType()
export class AssistantConversationTurn {
  @Field(() => String, { description: 'assistant | user' })
  @IsString()
  speaker!: string;

  @Field(() => String)
  @IsString()
  message!: string;
}

@ObjectType()
export class ProjectIdeationAssistantConversationExample {
  @Field(() => String, { description: "Message d'ouverture pré-écrit pour lancer la conversation" })
  @IsString()
  opening!: string;

  @Field(() => [AssistantConversationTurn], {
    description: 'Mini scénario de 2-3 tours pour illustrer le flow question/réponse',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantConversationTurn)
  turns!: AssistantConversationTurn[];

  @Field(() => String, {
    description: 'Question prioritaire à poser après le scénario (souvent issue de stepQuestions)',
  })
  @IsString()
  nextUserPrompt!: string;
}

@ObjectType()
export class AssistantDocumentDownload {
  @Field(() => String)
  @IsString()
  filename!: string;

  @Field(() => String)
  @IsString()
  mimeType!: string;

  @Field(() => String, { description: 'Titre lisible à afficher côté UI' })
  @IsString()
  title!: string;

  @Field(() => String, {
    description: "Encodage du contenu ('utf8' pour texte/Markdown, 'base64' pour PDF)",
  })
  @IsString()
  @IsEnum(['utf8', 'base64'])
  encoding!: 'utf8' | 'base64';

  @Field(() => String, { description: 'Contenu téléchargeable (Markdown ou texte)' })
  @IsString()
  content!: string;
}

@ObjectType()
export class AssistantDataUpdateStats {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  confidence?: number | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  completeness?: number | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  marketPotential?: string | null;
}

@ObjectType()
export class AssistantDataUpdateCanvas {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  problem?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  solution?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  target?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  valueProp?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  diff?: string | null;
}

@ObjectType()
export class AssistantDataUpdatePersona {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  name?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  goal?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  pain?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  behavior?: string | null;
}

@ObjectType()
export class AssistantDataUpdateRoadmapStep {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  step?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  deadline?: string | null;
}

@ObjectType()
export class ProjectIdeationAssistantDataUpdate {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  vision?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  problems?: string[] | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[] | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  sector?: string | null;

  @Field(() => AssistantDataUpdateStats, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantDataUpdateStats)
  stats?: AssistantDataUpdateStats | null;

  @Field(() => AssistantDataUpdateCanvas, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantDataUpdateCanvas)
  canvas?: AssistantDataUpdateCanvas | null;

  @Field(() => AssistantDataUpdatePersona, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantDataUpdatePersona)
  persona?: AssistantDataUpdatePersona | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  hypotheses?: string[] | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  pitch?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  quickActions?: string[] | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  goal30Days?: string | null;

  @Field(() => [AssistantDataUpdateRoadmapStep], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantDataUpdateRoadmapStep)
  roadmap?: AssistantDataUpdateRoadmapStep[] | null;
}

@ObjectType()
export class ProjectIdeationAssistantPayload {
  @Field(() => String)
  @IsString()
  version!: string;

  @Field(() => String)
  @IsString()
  language!: string;

  @Field(() => ProjectIdeationAssistantStep)
  @IsEnum(ProjectIdeationAssistantStep)
  step!: ProjectIdeationAssistantStep;

  @Field(() => [ProjectIdeationAssistantStep])
  @IsArray()
  @IsEnum(ProjectIdeationAssistantStep, { each: true })
  availableSteps!: ProjectIdeationAssistantStep[];

  @Field(() => [String], { description: 'Questions suggérées pour guider la discussion front-end' })
  @IsArray()
  @IsString({ each: true })
  stepQuestions!: string[];

  @Field(() => ProjectIdeationAssistantInputEcho)
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantInputEcho)
  inputEcho!: ProjectIdeationAssistantInputEcho;

  @Field(() => ProjectIdeationAssistantExploration, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantExploration)
  exploration?: ProjectIdeationAssistantExploration | null;

  @Field(() => ProjectIdeationAssistantStructuration, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantStructuration)
  structuration?: ProjectIdeationAssistantStructuration | null;

  @Field(() => ProjectIdeationAssistantActionBlock, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantActionBlock)
  action?: ProjectIdeationAssistantActionBlock | null;

  @Field(() => ProjectIdeationAssistantDocumentation, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantDocumentation)
  documentation?: ProjectIdeationAssistantDocumentation | null;

  @Field(() => [AssistantElearningRecommendation], { nullable: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantElearningRecommendation)
  elearning?: AssistantElearningRecommendation[] | null;

  @Field(() => AssistantOrientationBlock, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => AssistantOrientationBlock)
  orientation?: AssistantOrientationBlock | null;

  @Field(() => ProjectIdeationAssistantGuidance, {
    nullable: true,
    description: 'Guidage conversationnel (nudges UI, stats segments, alertes)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantGuidance)
  guidance?: ProjectIdeationAssistantGuidance | null;

  @Field(() => String, {
    nullable: true,
    description: 'Réponse conversationnelle prête à afficher côté UI',
  })
  @IsOptional()
  @IsString()
  assistantReply?: string | null;

  @Field(() => ProjectIdeationAssistantDataUpdate, {
    nullable: true,
    description: 'Delta de données métier extrait de la réponse utilisateur',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantDataUpdate)
  dataUpdate?: ProjectIdeationAssistantDataUpdate | null;

  @Field(() => ProjectIdeationAssistantConversationExample, {
    nullable: true,
    description: 'Exemple clé-en-main de conversation pour démarrer et illustrer le flow attendu',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantConversationExample)
  conversationExample?: ProjectIdeationAssistantConversationExample | null;

  @Field(() => [AssistantConversationMessage], {
    nullable: true,
    description: 'Historique condensé des échanges utilisateur/assistant pour conserver le contexte',
  })
  @IsOptional()
  @Type(() => AssistantConversationMessage)
  @IsArray()
  conversationTrace?: AssistantConversationMessage[] | null;

  @Field(() => [AssistantDocumentDownload], {
    nullable: true,
    description: 'Fichiers téléchargeables (Markdown) générés à partir du bloc Documentation',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssistantDocumentDownload)
  documentationDownloads?: AssistantDocumentDownload[] | null;
}

@ObjectType()
export class ProjectIdeationAssistantSavedRun {
  @Field(() => String)
  @IsString()
  id!: string;

  @Field(() => ProjectIdeationAssistantStep)
  @IsEnum(ProjectIdeationAssistantStep)
  step!: ProjectIdeationAssistantStep;

  @Field(() => String)
  @IsString()
  language!: string;

  @Field(() => ProjectIdeationAssistantInputEcho)
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantInputEcho)
  inputEcho!: ProjectIdeationAssistantInputEcho;

  @Field(() => ProjectIdeationAssistantPayload)
  @ValidateNested()
  @Type(() => ProjectIdeationAssistantPayload)
  payload!: ProjectIdeationAssistantPayload;

  @Field(() => GraphQLISODateTime)
  @IsDate()
  @Type(() => Date)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  @IsDate()
  @Type(() => Date)
  updatedAt!: Date;
}

import type {
  AssistantDocumentDownload,
  ProjectIdeationAssistantActionBlock,
  ProjectIdeationAssistantConversationExample,
  ProjectIdeationAssistantDocumentation,
  ProjectIdeationAssistantExploration,
  ProjectIdeationAssistantStructuration,
  ProjectIdeationAssistantStep,
  AssistantConversationMessage,
} from './assistant.types';

export interface ProjectIdeationDataUpdateStats {
  confidence?: number | null;
  completeness?: number | null;
  marketPotential?: string | null;
}

export interface ProjectIdeationDataUpdate {
  vision?: string | null;
  problems?: string[] | null;
  keywords?: string[] | null;
  sector?: string | null;
  stats?: ProjectIdeationDataUpdateStats | null;
  canvas?: {
    problem?: string | null;
    solution?: string | null;
    target?: string | null;
    valueProp?: string | null;
    diff?: string | null;
  } | null;
  persona?: {
    name?: string | null;
    goal?: string | null;
    pain?: string | null;
    behavior?: string | null;
  } | null;
  hypotheses?: string[] | null;
  pitch?: string | null;
  quickActions?: string[] | null;
  goal30Days?: string | null;
  roadmap?: Array<{ step?: string | null; deadline?: string | null }> | null;
}

export interface NormalizedProjectIdeationInput {
  idea: string;
  context?: string | null;
  motivation?: string | null;
  problem?: string | null;
  targetAudience?: string | null;
  stage?: string | null;
  constraints?: string | null;
  resources?: string | null;
  differentiator?: string | null;
  successMetric?: string | null;
  language: 'fr' | 'en';
  step: ProjectIdeationAssistantStep;
  conversationHistory: AssistantConversationMessage[];
}

export interface ProjectIdeationLLMResponse {
  reply?: string | null;
  dataUpdate?: ProjectIdeationDataUpdate | null;
  exploration?: ProjectIdeationAssistantExploration;
  structuration?: ProjectIdeationAssistantStructuration;
  action?: ProjectIdeationAssistantActionBlock;
  documentation?: ProjectIdeationAssistantDocumentation;
  orientation?: { recommendedSteps: string[]; focusAreas: string[] };
  elearning?: Array<{ moduleCode: string; reason: string }>;
  guidance?: {
    nudges: string[];
    segmentInsights: Array<{
      segment: string;
      painsOrNeeds: string;
      successSignals: string;
      indicativeSuccessRate?: string | null;
      confidence?: string | null;
    }>;
    riskAlerts: string[];
    suggestedNextInput?: string | null;
    projectSuccessStats?: string | null;
    marketPotential?: string | null;
    appNameIdeas?: string[];
  };
  conversationTrace?: AssistantConversationMessage[];
}

export interface ElearningCatalogEntry {
  code: string;
  title: Record<'fr' | 'en', string>;
  description: Record<'fr' | 'en', string>;
  focus: Record<'fr' | 'en', string>;
  urlPath: string;
}

export interface ElearningCatalogItem extends ElearningCatalogEntry {
  url: string;
}

export type AssistantDocumentDownloadsBuilder = (
  language: 'fr' | 'en',
  documentation?: ProjectIdeationAssistantDocumentation | null,
) => AssistantDocumentDownload[] | null;

export type StepQuestionBuilder = (input: NormalizedProjectIdeationInput) => string[];

export type ConversationExampleBuilder = (
  input: NormalizedProjectIdeationInput,
  appName: string,
  focus: string,
  stepQuestions: string[],
) => ProjectIdeationAssistantConversationExample;

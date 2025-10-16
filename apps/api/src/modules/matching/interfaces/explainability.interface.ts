import { DimensionKey, MatchImprovementAction } from '../interfaces/dimension-score.interface';


export interface MatchForceInsight {
  dimension: DimensionKey;
  label: string;
  description: string;
}

export interface MatchGapInsight {
  dimension: DimensionKey;
  label: string;
  description: string;
  impact: number;
}

export interface RecommendationInsight extends MatchImprovementAction {
  dimension: DimensionKey;
  priority: number;
}

export interface CompetitiveInsight {
  rank?: number;
  percentile?: number;
  totalCandidates?: number;
  uniqueAdvantages: string[];
  confidence: number;
}

export interface BidirectionalInsight {
  forProfile: string[];
  forProject: string[];
}

export interface ChemistryInsight {
  score: number;
  successProbability: number;
  successConfidence: number;
  modelVersion?: string | null;
  notes: string[];
}

export interface ContactPlanStep {
  title: string;
  description: string;
}

export interface ContactContext {
  profileLocation?: string | null;
  profileTimezone?: string | null;
  projectTimezone?: string | null;
  profileCollaborationMode?: string | null;
  projectCollaborationMode?: string | null;
  profileCommunicationStyle?: string | null;
  projectCommunicationStyle?: string | null;
  profileCommunicationFrequency?: string | null;
  projectCommunicationFrequency?: string | null;
  profileRemotePreference?: number | null;
  projectRemoteRatioMin?: number | null;
  projectRemoteRatioMax?: number | null;
  projectEnvironment?: string | null;
}

export interface ExplainabilityPayload {
  forces: MatchForceInsight[];
  gaps: MatchGapInsight[];
  recommendations: RecommendationInsight[];
  competitive?: CompetitiveInsight;
  bidirectional?: BidirectionalInsight;
  chemistry: ChemistryInsight;
  confidence: number;
  contactPlan: ContactPlanStep[];
}

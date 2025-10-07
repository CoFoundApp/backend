import { MatchDetailLevel } from '../types/match-detail-level.enum';
import { DimensionScoreResult,  } from '../interfaces/dimension-score.interface';
import { TechnicalScoreInput } from '../services/technical-score.service';
import { CultureScoreInput } from './culture.interface';
import { TeamChemistryInput } from './team-chemistry.interface';
import { LogisticsScoreInput } from './score.interface';
import { ExperienceScoreInput } from './Experience.interface';
import { SemanticScoreInput } from '../services/semantic-score.service';
import { ExplainabilityPayload, ContactContext } from './explainability.interface';
import { UrgencyLevel } from '../../../common/enums/domain.enums';

export interface CompositeScoreInput {
  detailLevel: MatchDetailLevel;
  context: {
    sector?: string | null;
    projectType?: string | null;
    urgency?: UrgencyLevel | null;
  };
  technical: TechnicalScoreInput;
  culture: CultureScoreInput;
  team: TeamChemistryInput;
  logistics: LogisticsScoreInput;
  experience: ExperienceScoreInput;
  semantic: SemanticScoreInput;
  contact?: ContactContext;
}

export interface CompositeScoreOutput {
  score: number;
  dimensionResults: DimensionScoreResult[];
  chemistryScore: number;
  successProbability: number;
  successConfidence: number;
  successModelVersion: string | null;
  explainability: ExplainabilityPayload;
}

import { Module } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { MatchingService } from './matching.service';
import { MatchingResolver } from './matching.resolver';
import { EmbeddingModule } from '../embedding/embedding.module';
import { TechnicalScoreService } from './services/technical-score.service';
import { CultureScoreService } from './services/culture-score.service';
import { TeamChemistryService } from './services/team-chemistry.service';
import { LogisticsScoreService } from './services/logistics-score.service';
import { ExperienceScoreService } from './services/experience-score.service';
import { SemanticScoreService } from './services/semantic-score.service';
import { ExplainabilityService } from './services/explainability.service';
import { WeightAdaptationService } from './services/weight-adaptation.service';
import { CompositeScoreService } from './services/composite-score.service';
import { SuccessPredictionService } from './services/success-prediction.service';

@Module({
  imports: [EmbeddingModule],
  providers: [
    PrismaService,
    MatchingService,
    MatchingResolver,
    TechnicalScoreService,
    CultureScoreService,
    TeamChemistryService,
    LogisticsScoreService,
    ExperienceScoreService,
    SemanticScoreService,
    ExplainabilityService,
    WeightAdaptationService,
    CompositeScoreService,
    SuccessPredictionService,
  ],
  exports: [MatchingService],
})
export class MatchingModule {}

import { Injectable } from '@nestjs/common';
import { MatchDetailLevel } from '../types/match-detail-level.enum';
import {
  CompositeScoreContext,
  DimensionKey,
  DimensionScoreResult,
  MatchImprovementAction,
} from './dimension-score.interface';

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

@Injectable()
export class ExplainabilityService {
  buildExplainability(args: {
    dimensionResults: DimensionScoreResult[];
    detailLevel: MatchDetailLevel;
    weightContext: CompositeScoreContext;
    chemistryScore: number;
    successProbability: number;
    successConfidence: number;
    successModelVersion: string | null;
    bidirectionalNotes?: BidirectionalInsight;
    competitiveStats?: CompetitiveInsight;
    contactContext?: ContactContext;
  }): ExplainabilityPayload {
    const {
      dimensionResults,
      detailLevel,
      weightContext,
      chemistryScore,
      successProbability,
      successConfidence,
      successModelVersion,
      bidirectionalNotes,
      competitiveStats,
      contactContext,
    } = args;

    const forces = this.buildForces(dimensionResults);
    const gaps = this.buildGaps(dimensionResults);
    const recommendations = this.buildRecommendations(dimensionResults);
    const confidence = this.computeConfidence(dimensionResults, weightContext);
    const contactPlan = this.buildContactPlan(dimensionResults, contactContext);

    const chemistry: ChemistryInsight = {
      score: Number(chemistryScore.toFixed(3)),
      successProbability: Number(successProbability.toFixed(3)),
      successConfidence: Number(successConfidence.toFixed(3)),
      modelVersion: successModelVersion,
      notes: chemistryScore >= 0.7
        ? ['Styles de collaboration compatibles']
        : ['Prévoir un alignement sur le mode de collaboration'],
    };

    let competitive: CompetitiveInsight | undefined;
    if (detailLevel === MatchDetailLevel.COMPETITIVE || detailLevel === MatchDetailLevel.BIDIRECTIONAL) {
      competitive = competitiveStats ?? {
        uniqueAdvantages: forces.slice(0, 2).map((force) => force.label),
        confidence,
      };
    }

    return {
      forces,
      gaps,
      recommendations,
      confidence,
      chemistry,
      competitive,
      bidirectional: detailLevel === MatchDetailLevel.BIDIRECTIONAL ? bidirectionalNotes ?? { forProfile: [], forProject: [] } : undefined,
      contactPlan,
    };
  }

  private buildForces(dimensions: DimensionScoreResult[]): MatchForceInsight[] {
    const insights: MatchForceInsight[] = [];
    for (const dimension of dimensions) {
      const top = dimension.strengths.slice(0, 2);
      for (const entry of top) {
        insights.push({ dimension: dimension.key, label: entry, description: entry });
      }
    }
    return insights.slice(0, 5);
  }

  private buildGaps(dimensions: DimensionScoreResult[]): MatchGapInsight[] {
    const insights: MatchGapInsight[] = [];
    for (const dimension of dimensions) {
      const impact = 1 - dimension.score;
      for (const entry of dimension.gaps.slice(0, 2)) {
        insights.push({ dimension: dimension.key, label: entry, description: entry, impact: Number(impact.toFixed(2)) });
      }
    }
    return insights.slice(0, 4);
  }

  private buildRecommendations(dimensions: DimensionScoreResult[]): RecommendationInsight[] {
    const candidates: RecommendationInsight[] = [];
    for (const dimension of dimensions) {
      dimension.actions.forEach((action, index) => {
        candidates.push({
          dimension: dimension.key,
          label: action.label,
          impact: action.impact,
          effort: action.effort,
          eta: action.eta,
          detailLevel: action.detailLevel,
          priority: Number((action.impact / Math.max(0.1, action.effort)).toFixed(2)),
        });
      });
    }
    return candidates
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
  }

  private computeConfidence(dimensions: DimensionScoreResult[], context: CompositeScoreContext): number {
    if (!dimensions.length) return 0;
    const weightMap = new Map<DimensionKey, number>();
    context.weights.forEach((w) => weightMap.set(w.key, w.confidence));
    const aggregated = dimensions.reduce((acc, dimension) => acc + dimension.confidence * (weightMap.get(dimension.key) ?? 0.5), 0);
    const normaliser = context.weights.reduce((acc, curr) => acc + (weightMap.get(curr.key) ?? 0.5), 0);
    return normaliser ? Number((aggregated / normaliser).toFixed(3)) : 0.5;
  }

  private buildContactPlan(dimensions: DimensionScoreResult[], context?: ContactContext): ContactPlanStep[] {
    const steps: ContactPlanStep[] = [];
    const introStyle = this.resolveIntroStyle(context);
    const timezoneNote = this.resolveTimezoneNote(context);
    steps.push({
      title: 'Étape 1 — Appel d’introduction',
      description: `${introStyle}${timezoneNote ? ` ${timezoneNote}` : ''}`.trim(),
    });

    steps.push(this.resolveEngagementStep(context));

    const gap = dimensions.find((dimension) => dimension.gaps.length)?.gaps[0];
    steps.push(this.resolveFollowUpStep(context, gap));

    return steps;
  }

  private resolveIntroStyle(context?: ContactContext): string {
    const style = context?.projectCommunicationStyle ?? context?.profileCommunicationStyle;
    switch (style) {
      case 'direct':
        return "Planifiez un appel focalisé de 20 minutes pour entrer rapidement dans le vif du sujet.";
      case 'formal':
        return "Organisez une réunion cadrée de 30 minutes avec un ordre du jour partagé à l’avance.";
      case 'casual':
        return "Proposez un café virtuel détendu pour apprendre à vous connaître.";
      case 'diplomatic':
        return "Préparez une conversation exploratoire de 30 minutes afin d’aligner vos attentes respectives.";
      default:
        return "Bloquez un échange vidéo de 25 minutes pour valider l’alignement et les objectifs.";
    }
  }

  private resolveTimezoneNote(context?: ContactContext): string {
    if (!context?.profileTimezone || !context?.projectTimezone) return '';
    if (context.profileTimezone === context.projectTimezone) {
      return 'Vous êtes sur le même fuseau horaire, proposez plusieurs créneaux dès cette semaine.';
    }
    return `Anticipez le décalage entre ${context.profileTimezone} et ${context.projectTimezone} en suggérant plusieurs options.`;
  }

  private resolveEngagementOrientation(context?: ContactContext): 'onsite' | 'hybrid' | 'remote' {
    if (!context) return 'hybrid';
    const { projectRemoteRatioMax, projectRemoteRatioMin, profileRemotePreference, projectCollaborationMode, projectEnvironment } = context;

    if (projectRemoteRatioMax != null && projectRemoteRatioMax <= 30) return 'onsite';
    if (projectRemoteRatioMin != null && projectRemoteRatioMin >= 70) return 'remote';
    if (profileRemotePreference != null) {
      if (profileRemotePreference <= 30) return 'onsite';
      if (profileRemotePreference >= 70) return 'remote';
    }
    if (projectCollaborationMode === 'asynchronous') return 'remote';
    if (projectCollaborationMode === 'synchronous' && projectEnvironment === 'startup') return 'onsite';
    return 'hybrid';
  }

  private resolveEngagementStep(context?: ContactContext): ContactPlanStep {
    const orientation = this.resolveEngagementOrientation(context);
    const collaboration = context?.projectCollaborationMode ?? context?.profileCollaborationMode ?? 'hybrid';
    const location = context?.profileLocation?.trim();

    if (orientation === 'onsite') {
      return {
        title: 'Étape 2 — Rencontre sur le terrain',
        description: `Profitez d’un évènement CoFound près de ${location || 'chez vous'} pour organiser une rencontre en personne et valider la collaboration ${
          collaboration === 'synchronous' ? 'autour d’un atelier' : 'dans un format workshop'
        }.`,
      };
    }

    if (orientation === 'remote') {
      return {
        title: 'Étape 2 — Atelier en ligne',
        description: `Inscrivez-vous ensemble à un prochain évènement communautaire CoFound en ligne pour tester votre collaboration ${
          collaboration === 'asynchronous' ? 'avec des livrables asynchrones et un canal Slack partagé' : 'lors d’une session visio animée'
        }.`,
      };
    }

    return {
      title: 'Étape 2 — Expérience hybride',
      description: `Combinez une session visio de co-création puis retrouvez-vous lors d’un évènement CoFound (présentiel ou virtuel) afin de valider la dynamique d’équipe.${
        location ? ` Les meetups proches de ${location} sont parfaits pour un premier atelier.` : ''
      }`,
    };
  }

  private resolveFollowUpStep(context: ContactContext | undefined, gap?: string): ContactPlanStep {
    const frequency = context?.projectCommunicationFrequency ?? context?.profileCommunicationFrequency;
    let cadence: string;
    switch (frequency) {
      case 'daily':
        cadence = 'Planifiez un point quotidien de 15 minutes pour sécuriser l’exécution.';
        break;
      case 'biweekly':
        cadence = 'Installez un suivi toutes les deux semaines pour mesurer les progrès et lever les risques.';
        break;
      case 'async':
        cadence = 'Définissez un canal asynchrone dédié (Notion/Slack) avec un compte-rendu hebdomadaire.';
        break;
      case 'weekly':
      default:
        cadence = 'Organisez un point hebdomadaire pour aligner les priorités et partager les livrables.';
        break;
    }

    const gapNote = gap ? ` Profitez-en pour adresser rapidement le point « ${gap} » identifié dans l’analyse.` : '';

    return {
      title: 'Étape 3 — Suivi et consolidation',
      description: `${cadence}${gapNote}`.trim(),
    };
  }
}

import { Injectable } from '@nestjs/common';
import { MatchDetailLevel } from '../types/match-detail-level.enum';
import {
  CompositeScoreContext,
  DimensionKey,
  DimensionScoreResult,
  MatchImprovementAction,
} from '../interfaces/dimension-score.interface';
import {
  MatchForceInsight,
  MatchGapInsight,
  RecommendationInsight,
  CompetitiveInsight,
  BidirectionalInsight,
  ChemistryInsight,
  ContactPlanStep,
  ContactContext,
  ExplainabilityPayload,
} from '../interfaces/explainability.interface';

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
    const contactPlan = this.buildContactPlan(
      dimensionResults,
      contactContext,
      successProbability,
      successConfidence,
    );

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

  private buildContactPlan(
    dimensions: DimensionScoreResult[],
    context: ContactContext | undefined,
    successProbability: number,
    successConfidence: number,
  ): ContactPlanStep[] {
    const introStyle = this.resolveIntroStyle(context);
    const timezoneNote = this.resolveTimezoneNote(context);
    const primaryStrength = this.selectPrimaryStrength(dimensions);
    const primaryGap = this.selectPrimaryGap(dimensions);

    const baseSteps: ContactPlanStep[] = [
      {
        title: 'Appel d’introduction',
        description: `${introStyle}${timezoneNote ? ` ${timezoneNote}` : ''}`.trim(),
      },
    ];

    if (primaryStrength) {
      baseSteps.push(this.resolveStrengthActivationStep(primaryStrength, context));
    }

    baseSteps.push(this.resolveEngagementStep(context, primaryStrength?.dimension));

    baseSteps.push(this.resolveFollowUpStep(context, primaryGap));

    baseSteps.push(
      this.resolveFeedbackLoopStep(
        context,
        primaryStrength,
        primaryGap,
        successProbability,
        successConfidence,
      ),
    );

    return baseSteps.map((step, index) => ({
      title: `Étape ${index + 1} — ${step.title}`,
      description: step.description,
    }));
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

  private resolveEngagementStep(
    context: ContactContext | undefined,
    focusDimension?: DimensionKey,
  ): ContactPlanStep {
    const orientation = this.resolveEngagementOrientation(context);
    const collaboration = context?.projectCollaborationMode ?? context?.profileCollaborationMode ?? 'hybrid';
    const location = context?.profileLocation?.trim();
    const focusNote = focusDimension ? this.focusNoteForDimension(focusDimension) : '';

    if (orientation === 'onsite') {
      return {
        title: 'Rencontre sur le terrain',
        description: `Profitez d’un évènement CoFound près de ${location || 'chez vous'} pour organiser une rencontre en personne et valider la collaboration ${
          collaboration === 'synchronous' ? 'autour d’un atelier' : 'dans un format workshop'
        }.${focusNote}`.trim(),
      };
    }

    if (orientation === 'remote') {
      return {
        title: 'Atelier en ligne',
        description: `Inscrivez-vous ensemble à un prochain évènement communautaire CoFound en ligne pour tester votre collaboration ${
          collaboration === 'asynchronous' ? 'avec des livrables asynchrones et un canal Slack partagé' : 'lors d’une session visio animée'
        }.${focusNote}`.trim(),
      };
    }

    return {
      title: 'Expérience hybride',
      description: `Combinez une session visio de co-création puis retrouvez-vous lors d’un évènement CoFound (présentiel ou virtuel) afin de valider la dynamique d’équipe.${
        location ? ` Les meetups proches de ${location} sont parfaits pour un premier atelier.` : ''
      }${focusNote}`.trim(),
    };
  }

  private resolveFollowUpStep(
    context: ContactContext | undefined,
    gap?: { dimension: DimensionKey; label: string },
  ): ContactPlanStep {
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

    const gapNote = gap
      ? ` Consacrez les 10 premières minutes à lever l’écart ${this.dimensionLabel(gap.dimension).toLowerCase()} (« ${gap.label} »).`
      : ' Utilisez ce créneau pour aligner vos KPIs intermédiaires.';

    return {
      title: 'Suivi prioritaire',
      description: `${cadence}${gapNote}`.trim(),
    };
  }

  private resolveStrengthActivationStep(
    strength: { dimension: DimensionKey; label: string; score: number },
    context?: ContactContext,
  ): ContactPlanStep {
    const dimensionLabel = this.dimensionLabel(strength.dimension);
    const collaboration = context?.projectCollaborationMode ?? context?.profileCollaborationMode ?? 'hybrid';
    const emphasis = strength.score >= 0.75 ? 'capitaliser sur' : 'explorer davantage';
    const activity = this.activityForDimension(strength.dimension, collaboration);

    return {
      title: `Activation du point fort ${dimensionLabel.toLowerCase()}`,
      description: `Planifiez une session dédiée pour ${emphasis} « ${strength.label} » et ${activity}.`,
    };
  }

  private resolveFeedbackLoopStep(
    context: ContactContext | undefined,
    strength: { dimension: DimensionKey; label: string } | undefined,
    gap: { dimension: DimensionKey; label: string } | undefined,
    successProbability: number,
    successConfidence: number,
  ): ContactPlanStep {
    const orientation = this.resolveEngagementOrientation(context);
    const tool = orientation === 'onsite' ? 'un espace Notion partagé' : orientation === 'remote' ? 'un canal Slack dédié' : 'Notion + Slack';
    const probability = this.formatPercentage(successProbability);
    const confidence = this.formatPercentage(successConfidence);
    const probabilityNote = probability
      ? ` Comparez vos retours terrain à la probabilité de succès estimée (${probability}${confidence ? ` · confiance ${confidence}` : ''}).`
      : '';
    const strengthNote = strength ? ` Capitalisez sur « ${strength.label} » pour consolider la dynamique.` : '';
    const gapNote = gap ? ` Définissez des indicateurs pour mesurer la progression sur « ${gap.label} ».` : '';

    return {
      title: 'Boucle de feedback et mesure',
      description: `Bloquez un bilan à J+14 et centralisez les apprentissages dans ${tool}.${probabilityNote}${strengthNote}${gapNote}`.trim(),
    };
  }

  private selectPrimaryStrength(
    dimensions: DimensionScoreResult[],
  ): { dimension: DimensionKey; label: string; score: number } | undefined {
    const ordered = [...dimensions].sort((a, b) => b.score - a.score);
    for (const dimension of ordered) {
      const label = dimension.strengths[0];
      if (label) {
        return { dimension: dimension.key, label, score: Number(dimension.score.toFixed(2)) };
      }
    }
    return undefined;
  }

  private selectPrimaryGap(
    dimensions: DimensionScoreResult[],
  ): { dimension: DimensionKey; label: string } | undefined {
    const ordered = [...dimensions].sort((a, b) => a.score - b.score);
    for (const dimension of ordered) {
      const label = dimension.gaps[0];
      if (label) {
        return { dimension: dimension.key, label };
      }
    }
    return undefined;
  }

  private dimensionLabel(dimension: DimensionKey): string {
    switch (dimension) {
      case 'technical':
        return 'Technique';
      case 'culture':
        return 'Culture';
      case 'team':
        return 'Équipe';
      case 'logistics':
        return 'Logistique';
      case 'experience':
        return 'Expérience';
      case 'semantic':
      default:
        return 'Vision produit';
    }
  }

  private activityForDimension(dimension: DimensionKey, collaboration: string): string {
    switch (dimension) {
      case 'technical':
        return collaboration === 'asynchronous'
          ? 'échanger des snippets de code ou des proof-of-concepts avant la rencontre'
          : 'co-construire un mini proof-of-concept pendant une session partagée';
      case 'culture':
        return 'partager vos rituels d’équipe et clarifier vos valeurs de collaboration';
      case 'team':
        return 'identifier les rôles complémentaires et la prise de décision au quotidien';
      case 'logistics':
        return 'valider les contraintes agenda, outils et disponibilité sur les deux prochaines semaines';
      case 'experience':
        return 'faire raconter un cas d’usage marquant pour ancrer la proposition de valeur';
      case 'semantic':
      default:
        return 'clarifier la vision produit et la manière de la communiquer aux parties prenantes';
    }
  }

  private focusNoteForDimension(dimension: DimensionKey): string {
    switch (dimension) {
      case 'technical':
        return ' Ancrez la discussion sur les défis techniques identifiés pour profiter immédiatement de votre complémentarité.';
      case 'culture':
        return ' Prenez quelques minutes pour aligner vos valeurs, rituels et styles de feedback.';
      case 'team':
        return ' Clarifiez la répartition des rôles et comment chacun aime prendre des décisions collectives.';
      case 'logistics':
        return ' Passez en revue les contraintes de disponibilité et vos outils favoris pour éviter les frictions.';
      case 'experience':
        return ' Comparez vos expériences passées pour identifier les scénarios où votre duo performe le mieux.';
      case 'semantic':
      default:
        return ' Affinez ensemble le pitch et les messages clés à porter auprès des parties prenantes.';
    }
  }

  private formatPercentage(value: number | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '';
    }
    return `${Math.round(value * 100)}%`;
  }
}

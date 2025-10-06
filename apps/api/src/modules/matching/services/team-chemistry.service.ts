import { Injectable } from '@nestjs/common';
import { DimensionScoreResult } from './dimension-score.interface';

export interface TeamChemistryInput {
  preferredTeamSize?: string | null;
  projectPreferredSize?: string | null;
  desiredRole?: string | null;
  projectRoleNeed?: string | null;
  communicationStyle?: string | null;
  projectCommunicationStyle?: string | null;
  communicationFrequency?: string | null;
  projectCommunicationFrequency?: string | null;
  teamRoles?: string[] | null;
}

const COMPATIBILITY_TABLE: Record<string, Record<string, number>> = {
  leader: { leader: 0.6, contributor: 0.8, mentor: 0.7, learner: 0.5 },
  contributor: { leader: 0.8, contributor: 0.9, mentor: 0.75, learner: 0.7 },
  mentor: { leader: 0.75, contributor: 0.65, mentor: 0.8, learner: 0.9 },
  learner: { leader: 0.8, contributor: 0.9, mentor: 0.85, learner: 0.6 },
};

@Injectable()
export class TeamChemistryService {
  async evaluate(input: TeamChemistryInput): Promise<DimensionScoreResult> {
    const {
      preferredTeamSize,
      projectPreferredSize,
      desiredRole,
      projectRoleNeed,
      communicationStyle,
      projectCommunicationStyle,
      communicationFrequency,
      projectCommunicationFrequency,
      teamRoles,
    } = input;

    const sizeScore = this.computeSizeCompatibility(preferredTeamSize, projectPreferredSize);
    const roleScore = this.computeRoleCompatibility(desiredRole, projectRoleNeed);
    const commStyleScore = this.computeStyleCompatibility(communicationStyle, projectCommunicationStyle);
    const commFreqScore = this.computeStyleCompatibility(communicationFrequency, projectCommunicationFrequency);
    const diversityScore = this.computeDiversityScore(teamRoles, desiredRole);

    const composite = 0.25 * sizeScore + 0.3 * roleScore + 0.25 * commStyleScore + 0.1 * commFreqScore + 0.1 * diversityScore;
    const strengths: string[] = [];
    const gaps: string[] = [];

    if (roleScore >= 0.75) {
      strengths.push('Rôle proposé très complémentaire de l’équipe');
    } else if (roleScore < 0.45 && projectRoleNeed) {
      gaps.push('Rôle souhaité à réaligner avec les attentes de l’équipe');
    }

    if (sizeScore >= 0.7) {
      strengths.push('Taille d’équipe idéale pour le profil');
    }

    if (commStyleScore < 0.5 && projectCommunicationStyle) {
      gaps.push('Style de communication potentiel à discuter');
    }

    const actions = gaps.length
      ? [
          {
            label: 'Clarifier les attentes de rôle et la communication avec l’équipe',
            impact: 0.12,
            effort: 0.2,
            eta: '1 réunion',
          },
        ]
      : [];

    return {
      key: 'team',
      score: Number(composite.toFixed(3)),
      confidence: this.computeConfidence(input),
      strengths,
      gaps,
      actions,
      debug: {
        sizeScore,
        roleScore,
        commStyleScore,
        commFreqScore,
        diversityScore,
      },
    };
  }

  private computeSizeCompatibility(profile?: string | null, project?: string | null) {
    if (!profile || !project) return 0.5;
    if (profile === 'flexible' || project === 'flexible') return 0.8;
    return profile === project ? 1 : 0.4;
  }

  private computeRoleCompatibility(profile?: string | null, project?: string | null) {
    if (!profile || !project) return 0.5;
    const table = COMPATIBILITY_TABLE[profile];
    if (!table) return 0.5;
    return table[project] ?? 0.5;
  }

  private computeStyleCompatibility(profile?: string | null, project?: string | null) {
    if (!profile || !project) return 0.5;
    if (profile === project) return 1;
    if (profile === 'async' || project === 'async') return 0.6;
    return 0.45;
  }

  private computeDiversityScore(teamRoles?: string[] | null, desiredRole?: string | null) {
    if (!teamRoles || !teamRoles.length || !desiredRole) return 0.6;
    const roles = teamRoles;
    const count = roles.filter((role) => role === desiredRole).length;
    const diversity = roles.length ? 1 - count / roles.length : 0.7;
    return 0.6 + 0.4 * diversity;
  }

  private computeConfidence(input: TeamChemistryInput): number {
    let confidence = 0.3;
    if (input.preferredTeamSize && input.projectPreferredSize) confidence += 0.2;
    if (input.desiredRole && input.projectRoleNeed) confidence += 0.2;
    if (input.communicationStyle && input.projectCommunicationStyle) confidence += 0.15;
    if (input.communicationFrequency && input.projectCommunicationFrequency) confidence += 0.1;
    if (input.teamRoles && input.teamRoles.length) confidence += 0.05;
    return Math.min(1, confidence);
  }
}

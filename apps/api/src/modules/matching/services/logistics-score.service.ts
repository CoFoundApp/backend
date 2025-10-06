import { Injectable } from '@nestjs/common';
import { DimensionScoreResult } from './dimension-score.interface';
import { ratio } from './score.utils';

export interface TimeSlotLike {
  day: string | number;
  start: string;
  end: string;
}

export interface LogisticsScoreInput {
  availabilityHours?: number | null;
  requiredHoursMin?: number | null;
  requiredHoursMax?: number | null;
  availabilitySlots?: TimeSlotLike[] | null;
  requiredSlots?: TimeSlotLike[] | null;
  profileTimezone?: string | null;
  projectTimezone?: string | null;
  remotePreference?: number | null;
  remoteRatioMin?: number | null;
  remoteRatioMax?: number | null;
  missionMinWeeks?: number | null;
  missionMaxWeeks?: number | null;
  projectMinWeeks?: number | null;
  projectMaxWeeks?: number | null;
}

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
};

const computeSlotOverlap = (a: TimeSlotLike[], b: TimeSlotLike[]) => {
  if (!a.length || !b.length) return 0;
  let overlap = 0;
  let total = 0;
  const normaliseDay = (value: string | number) => value.toString().toLowerCase();
  const map = new Map<string, TimeSlotLike[]>();
  for (const slot of b) {
    const key = normaliseDay(slot.day);
    const arr = map.get(key) ?? [];
    arr.push(slot);
    map.set(key, arr);
  }
  for (const slot of a) {
    const key = normaliseDay(slot.day);
    const others = map.get(key) ?? [];
    const aStart = minutes(slot.start);
    const aEnd = minutes(slot.end);
    total += Math.max(0, aEnd - aStart);
    for (const other of others) {
      const oStart = minutes(other.start);
      const oEnd = minutes(other.end);
      const start = Math.max(aStart, oStart);
      const end = Math.min(aEnd, oEnd);
      if (end > start) {
        overlap += end - start;
      }
    }
  }
  return total > 0 ? Math.min(1, overlap / total) : 0;
};

@Injectable()
export class LogisticsScoreService {
  async evaluate(input: LogisticsScoreInput): Promise<DimensionScoreResult> {
    const availabilityScore = this.computeAvailabilityScore(input);
    const slotOverlap = computeSlotOverlap(input.availabilitySlots ?? [], input.requiredSlots ?? []);
    const remoteScore = this.computeRemoteScore(input.remotePreference, input.remoteRatioMin, input.remoteRatioMax);
    const durationScore = this.computeDurationScore(
      input.missionMinWeeks,
      input.missionMaxWeeks,
      input.projectMinWeeks,
      input.projectMaxWeeks,
    );

    const timezoneScore = input.profileTimezone && input.projectTimezone
      ? input.profileTimezone === input.projectTimezone
        ? 1
        : 0.6
      : 0.5;

    const composite =
      0.35 * availabilityScore +
      0.25 * slotOverlap +
      0.15 * remoteScore +
      0.15 * durationScore +
      0.1 * timezoneScore;

    const strengths: string[] = [];
    const gaps: string[] = [];

    if (availabilityScore >= 0.7) strengths.push('Disponibilité horaire en ligne avec le besoin');
    if (slotOverlap >= 0.6) strengths.push('Créneaux compatibles pour collaborer');

    if (remoteScore < 0.5 && input.remoteRatioMin != null) {
      gaps.push('Préférence remote à ajuster pour ce projet');
    }

    if (durationScore < 0.5 && input.projectMinWeeks && input.missionMinWeeks) {
      gaps.push('Durée de mission à clarifier');
    }

    const actions = gaps.length
      ? [
          {
            label: 'Mettre à jour sa disponibilité détaillée et préciser la flexibilité',
            impact: 0.1,
            effort: 0.15,
            eta: '10 minutes',
          },
        ]
      : [];

    return {
      key: 'logistics',
      score: Number(composite.toFixed(3)),
      confidence: this.computeConfidence(input),
      strengths,
      gaps,
      actions,
      debug: {
        availabilityScore,
        slotOverlap,
        remoteScore,
        durationScore,
        timezoneScore,
      },
    };
  }

  private computeAvailabilityScore(input: LogisticsScoreInput): number {
    const { availabilityHours, requiredHoursMin, requiredHoursMax } = input;
    if (!availabilityHours && !requiredHoursMin && !requiredHoursMax) return 0.5;
    if (!availabilityHours) return 0.4;
    if (!requiredHoursMin && !requiredHoursMax) return 0.8;
    if (requiredHoursMin != null && availabilityHours < requiredHoursMin) {
      return ratio(availabilityHours, requiredHoursMin);
    }
    if (requiredHoursMax != null && availabilityHours > requiredHoursMax) {
      return ratio(requiredHoursMax, availabilityHours);
    }
    return 1;
  }

  private computeRemoteScore(preference?: number | null, min?: number | null, max?: number | null) {
    if (preference == null && min == null && max == null) return 0.6;
    const pref = preference ?? 50;
    const floor = min ?? 0;
    const ceil = max ?? 100;
    if (pref >= floor && pref <= ceil) return 1;
    if (pref < floor) return ratio(pref, floor);
    return ratio(ceil, pref);
  }

  private computeDurationScore(
    minProfile?: number | null,
    maxProfile?: number | null,
    minProject?: number | null,
    maxProject?: number | null,
  ) {
    if (!minProject && !maxProject) return 0.6;
    const minOk = minProfile == null || minProject == null || minProfile <= minProject + 2;
    const maxOk = maxProfile == null || maxProject == null || maxProfile >= maxProject - 2;
    if (minOk && maxOk) return 1;
    if (!minOk && !maxOk) return 0.3;
    return 0.6;
  }

  private computeConfidence(input: LogisticsScoreInput): number {
    let confidence = 0.3;
    if (input.availabilityHours && (input.requiredHoursMin != null || input.requiredHoursMax != null)) confidence += 0.2;
    if ((input.availabilitySlots?.length ?? 0) && (input.requiredSlots?.length ?? 0)) confidence += 0.2;
    if (input.remotePreference != null && (input.remoteRatioMin != null || input.remoteRatioMax != null)) confidence += 0.1;
    if (
      (input.missionMinWeeks != null || input.missionMaxWeeks != null) &&
      (input.projectMinWeeks != null || input.projectMaxWeeks != null)
    )
      confidence += 0.15;
    if (input.profileTimezone && input.projectTimezone) confidence += 0.05;
    return Math.min(1, confidence);
  }
}

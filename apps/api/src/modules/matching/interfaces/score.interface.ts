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

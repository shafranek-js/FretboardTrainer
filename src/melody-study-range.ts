export interface MelodyStudyRange {
  startIndex: number;
  endIndex: number;
}

function normalizeTotalEvents(totalEvents: unknown) {
  if (typeof totalEvents !== 'number' || !Number.isFinite(totalEvents)) return 0;
  return Math.max(0, Math.round(totalEvents));
}

function normalizeIndexValue(value: unknown, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.round(parsed));
    }
  }

  return fallback;
}

export function buildDefaultMelodyStudyRange(totalEvents: number): MelodyStudyRange {
  const normalizedTotal = normalizeTotalEvents(totalEvents);
  if (normalizedTotal <= 0) {
    return { startIndex: 0, endIndex: 0 };
  }

  return {
    startIndex: 0,
    endIndex: normalizedTotal - 1,
  };
}

export function normalizeMelodyStudyRange(
  value: Partial<MelodyStudyRange> | null | undefined,
  totalEvents: number
): MelodyStudyRange {
  const defaultRange = buildDefaultMelodyStudyRange(totalEvents);
  const normalizedTotal = normalizeTotalEvents(totalEvents);
  if (normalizedTotal <= 0) return defaultRange;

  const startRaw = normalizeIndexValue(value?.startIndex, defaultRange.startIndex);
  const endRaw = normalizeIndexValue(value?.endIndex, defaultRange.endIndex);
  const clampedStart = Math.min(normalizedTotal - 1, startRaw);
  const clampedEnd = Math.min(normalizedTotal - 1, endRaw);

  return {
    startIndex: Math.min(clampedStart, clampedEnd),
    endIndex: Math.max(clampedStart, clampedEnd),
  };
}

export function isDefaultMelodyStudyRange(range: MelodyStudyRange, totalEvents: number) {
  const normalized = normalizeMelodyStudyRange(range, totalEvents);
  const defaultRange = buildDefaultMelodyStudyRange(totalEvents);
  return normalized.startIndex === defaultRange.startIndex && normalized.endIndex === defaultRange.endIndex;
}

export function getMelodyStudyRangeLength(range: MelodyStudyRange, totalEvents: number) {
  const normalized = normalizeMelodyStudyRange(range, totalEvents);
  const normalizedTotal = normalizeTotalEvents(totalEvents);
  if (normalizedTotal <= 0) return 0;
  return normalized.endIndex - normalized.startIndex + 1;
}

export function formatMelodyStudyRange(range: MelodyStudyRange, totalEvents: number) {
  const normalizedTotal = normalizeTotalEvents(totalEvents);
  if (normalizedTotal <= 0) return 'No steps';

  const normalized = normalizeMelodyStudyRange(range, totalEvents);
  return `Steps ${normalized.startIndex + 1}-${normalized.endIndex + 1}`;
}

export function formatMelodyStudyStepLabel(
  positionInRange: number,
  totalStepsInRange: number,
  studyRange: MelodyStudyRange,
  totalEvents: number
) {
  const normalizedRange = normalizeMelodyStudyRange(studyRange, totalEvents);
  const normalizedTotalSteps = Math.max(1, Math.round(totalStepsInRange));
  const normalizedPosition = Math.max(0, Math.round(positionInRange));
  const base = `[${normalizedPosition + 1}/${normalizedTotalSteps}]`;
  if (isDefaultMelodyStudyRange(normalizedRange, totalEvents)) {
    return base;
  }
  return `${base} ${formatMelodyStudyRange(normalizedRange, totalEvents)}`;
}

export function areMelodyStudyRangesEqual(
  left: MelodyStudyRange,
  right: MelodyStudyRange,
  totalEvents: number
) {
  const normalizedLeft = normalizeMelodyStudyRange(left, totalEvents);
  const normalizedRight = normalizeMelodyStudyRange(right, totalEvents);
  return (
    normalizedLeft.startIndex === normalizedRight.startIndex &&
    normalizedLeft.endIndex === normalizedRight.endIndex
  );
}

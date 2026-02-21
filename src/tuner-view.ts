export type TunerTone = 'neutral' | 'inTune' | 'flat' | 'sharp';

export interface TunerViewState {
  tone: TunerTone;
  centsText: string;
  translationPercent: number;
}

export function computeTunerView(
  frequency: number | null,
  targetFrequency: number | null,
  centsTolerance: number,
  centsVisualRange: number
): TunerViewState {
  if (!frequency || frequency <= 0 || !targetFrequency) {
    return {
      tone: 'neutral',
      centsText: '--',
      translationPercent: 0,
    };
  }

  const cents = 1200 * Math.log2(frequency / targetFrequency);
  const clampedCents = Math.max(-centsVisualRange, Math.min(centsVisualRange, cents));

  let tone: TunerTone = 'sharp';
  if (Math.abs(cents) <= centsTolerance) {
    tone = 'inTune';
  } else if (cents < 0) {
    tone = 'flat';
  }

  return {
    tone,
    centsText: `${cents > 0 ? '+' : ''}${cents.toFixed(1)} cents`,
    translationPercent: (clampedCents / centsVisualRange) * 50,
  };
}

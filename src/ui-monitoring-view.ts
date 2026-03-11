import { CENTS_TOLERANCE, CENTS_VISUAL_RANGE } from './constants';
import { dom } from './dom';
import { computeTunerView } from './tuner-view';

export interface TunerReadingState {
  frequency: number | null;
  targetFrequency: number | null;
}

export function renderVolumeLevel(volumeLevel: number) {
  const clampedPercent = Math.max(0, Math.min(100, volumeLevel * 500));
  dom.volumeBar.style.height = `${clampedPercent}%`;
}

export function renderTunerVisibility(isVisible: boolean) {
  if (isVisible) {
    dom.tunerDisplay.classList.add('visible');
    dom.tunerDisplay.classList.remove('invisible', 'opacity-0');
    return;
  }

  dom.tunerDisplay.classList.remove('visible');
  dom.tunerDisplay.classList.add('invisible', 'opacity-0');
}

export function renderTunerReading({ frequency, targetFrequency }: TunerReadingState) {
  const view = computeTunerView(frequency, targetFrequency, CENTS_TOLERANCE, CENTS_VISUAL_RANGE);
  const needle = dom.tunerNeedle;

  needle.classList.remove('bg-green-500', 'bg-cyan-500', 'bg-red-500', 'bg-yellow-400');
  if (view.tone === 'inTune') {
    needle.classList.add('bg-green-500');
  } else if (view.tone === 'flat') {
    needle.classList.add('bg-cyan-500');
  } else if (view.tone === 'sharp') {
    needle.classList.add('bg-red-500');
  }

  needle.style.transform = `translateX(-50%) translateY(${view.translationPercent}%)`;
  dom.tunerCents.textContent = view.centsText;
}

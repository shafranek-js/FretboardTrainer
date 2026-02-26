import { isChordDataMode } from './training-mode-groups';

export function isChordTrainingModeActive(trainingMode: string, isListening: boolean) {
  return isListening && isChordDataMode(trainingMode);
}

export function getEnabledStrings(selectorRoot: ParentNode) {
  return new Set(
    Array.from(selectorRoot.querySelectorAll('input:checked')).map(
      (checkbox) => (checkbox as HTMLInputElement).value
    )
  );
}

export function getSelectedFretRange(startValue: string, endValue: string) {
  const parsedStartFret = Number.parseInt(startValue, 10);
  const parsedEndFret = Number.parseInt(endValue, 10);
  const safeStartFret = Number.isFinite(parsedStartFret) ? parsedStartFret : 0;
  const safeEndFret = Number.isFinite(parsedEndFret) ? parsedEndFret : 20;

  return {
    minFret: Math.min(safeStartFret, safeEndFret),
    maxFret: Math.max(safeStartFret, safeEndFret),
  };
}

export interface FretboardLayout {
  fretCount: number;
  fretboardWidth: number;
  fretboardHeight: number;
  startY: number;
  stringSpacing: number;
  fretSpacing: number;
  noteRadius: number;
  noteFontSize: number;
  labelFontSize: number;
  nutX: number;
  openNoteX: number;
  fretNumberAreaHeight: number;
  fretWireXs: number[]; // index 0 = nut, index n = nth fret wire
  fretCenterXs: number[]; // index n = center of fret n (n>=1), index 0 = open note area center
}

interface LayoutOptions {
  fretCount?: number;
  openNoteAreaUnits?: number;
  fretToStringSpacingRatio?: number;
  horizontalPaddingRatio?: number;
  verticalPaddingRatio?: number;
  fretNumberAreaHeight?: number;
}

const DEFAULT_LAYOUT_OPTIONS: Required<LayoutOptions> = {
  fretCount: 12,
  openNoteAreaUnits: 1,
  fretToStringSpacingRatio: 2.5,
  horizontalPaddingRatio: 0.02,
  verticalPaddingRatio: 0.05,
  fretNumberAreaHeight: 30,
};

export function computeFretboardLayout(
  width: number,
  height: number,
  stringCount: number,
  options: LayoutOptions = {}
): FretboardLayout | null {
  if (width <= 0 || height <= 0 || stringCount <= 0) return null;

  const {
    fretCount,
    openNoteAreaUnits,
    fretToStringSpacingRatio,
    horizontalPaddingRatio,
    verticalPaddingRatio,
    fretNumberAreaHeight,
  } = { ...DEFAULT_LAYOUT_OPTIONS, ...options };

  const totalHorizontalUnits = fretCount + openNoteAreaUnits;
  const targetAspectRatio =
    (fretToStringSpacingRatio * totalHorizontalUnits) / (stringCount > 1 ? stringCount - 1 : 1);

  const paddingH = width * horizontalPaddingRatio;
  const paddingV = height * verticalPaddingRatio;
  const drawableWidth = width - paddingH * 2;
  const drawableHeight = height - paddingV * 2 - fretNumberAreaHeight;

  if (drawableWidth <= 0 || drawableHeight <= 0) return null;

  let fretboardWidth: number;
  let fretboardHeight: number;
  if (drawableWidth / drawableHeight > targetAspectRatio) {
    fretboardHeight = drawableHeight;
    fretboardWidth = fretboardHeight * targetAspectRatio;
  } else {
    fretboardWidth = drawableWidth;
    fretboardHeight = fretboardWidth / targetAspectRatio;
  }

  const drawingStartX = paddingH + (drawableWidth - fretboardWidth) / 2;
  const startY = paddingV + (drawableHeight - fretboardHeight) / 2;
  const stringSpacing = stringCount > 1 ? fretboardHeight / (stringCount - 1) : fretboardHeight / 2;
  const fretSpacing = fretboardWidth / totalHorizontalUnits;
  const noteRadius = Math.min(stringSpacing, fretSpacing) * 0.38;
  const noteFontSize = noteRadius;
  const labelFontSize = Math.min(width * 0.015, 14);
  const nutX = drawingStartX + openNoteAreaUnits * fretSpacing;
  const openNoteX = drawingStartX + openNoteAreaUnits * fretSpacing * 0.5;
  const playableBoardWidth = Math.max(1, fretboardWidth - openNoteAreaUnits * fretSpacing);
  const denominator = 1 - 2 ** (-fretCount / 12);
  const safeDenominator = denominator > 0 ? denominator : 1;
  const fretWireXs = Array.from({ length: fretCount + 1 }, (_, fret) => {
    if (fret === 0) return nutX;
    const normalizedDistance = (1 - 2 ** (-fret / 12)) / safeDenominator;
    return nutX + playableBoardWidth * normalizedDistance;
  });
  const fretCenterXs = Array.from({ length: fretCount + 1 }, (_, fret) => {
    if (fret === 0) return openNoteX;
    const left = fretWireXs[fret - 1] ?? nutX;
    const right = fretWireXs[fret] ?? nutX;
    return (left + right) / 2;
  });

  return {
    fretCount,
    fretboardWidth,
    fretboardHeight,
    startY,
    stringSpacing,
    fretSpacing,
    noteRadius,
    noteFontSize,
    labelFontSize,
    nutX,
    openNoteX,
    fretNumberAreaHeight,
    fretWireXs,
    fretCenterXs,
  };
}

export interface StringLabelPosition {
  index: number;
  x: number;
  y: number;
}

export function computeStringLabelPositions(
  stringCount: number,
  startY: number,
  stringSpacing: number,
  nutX: number,
  fretSpacing: number
): StringLabelPosition[] {
  if (stringCount <= 0) return [];

  const horizontalPosition = nutX - fretSpacing * 0.05;
  return Array.from({ length: stringCount }, (_, index) => ({
    index,
    x: horizontalPosition,
    y: startY + index * stringSpacing,
  }));
}

export function positionStringLabels(
  labels: HTMLElement[],
  stringCount: number,
  startY: number,
  stringSpacing: number,
  nutX: number,
  fretSpacing: number
) {
  if (labels.length === 0 || labels.length !== stringCount) return;

  const positions = computeStringLabelPositions(
    stringCount,
    startY,
    stringSpacing,
    nutX,
    fretSpacing
  );
  positions.forEach(({ index, x, y }) => {
    const label = labels[index];
    label.style.position = 'absolute';
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    label.style.transform = 'translate(-100%, -50%)';
  });
}

export interface TimelinePrerollLayout {
  leadInChars: number;
  stepCount: number;
  stepWidth: number;
}

export function computeClassicTimelinePrerollLayout(
  eventWidths: number[],
  showPrerollLeadIn: boolean
): TimelinePrerollLayout {
  const leadInChars = showPrerollLeadIn
    ? Math.max(
        8,
        Math.min(
          16,
          eventWidths.slice(0, Math.min(4, eventWidths.length)).reduce((sum, width) => sum + width, 0)
        )
      )
    : 0;
  const stepCount = showPrerollLeadIn ? 4 : 0;
  const stepWidth = stepCount > 0 ? Math.max(2, Math.round(leadInChars / stepCount)) : 0;
  return {
    leadInChars,
    stepCount,
    stepWidth,
  };
}

export function appendClassicTimelinePreroll(
  line: HTMLElement,
  layout: TimelinePrerollLayout,
  activePrerollStepIndex: number | null,
  isHeader: boolean
) {
  if (layout.leadInChars <= 0 || layout.stepCount <= 0 || layout.stepWidth <= 0) {
    return;
  }

  for (let prerollStep = 0; prerollStep < layout.stepCount; prerollStep += 1) {
    const prerollCell = document.createElement('span');
    const isActivePrerollStep = activePrerollStepIndex === prerollStep;
    prerollCell.className =
      `inline-block px-[1px] rounded-sm ${isHeader ? 'text-slate-600' : 'text-slate-600/80'}` +
      (isActivePrerollStep ? ' text-slate-50' : '');
    prerollCell.style.minWidth = `${layout.stepWidth}ch`;
    prerollCell.style.width = `${layout.stepWidth}ch`;
    if (isActivePrerollStep) {
      prerollCell.style.backgroundColor = 'rgba(34, 211, 238, 0.24)';
      prerollCell.style.boxShadow = 'inset 0 0 0 1px rgba(34, 211, 238, 0.4)';
      prerollCell.style.color = '#ecfeff';
    }
    prerollCell.textContent = isHeader
      ? String(prerollStep + 1).padEnd(layout.stepWidth, ' ')
      : '-'.repeat(layout.stepWidth);
    line.appendChild(prerollCell);
  }

  const prerollEndPipe = document.createElement('span');
  prerollEndPipe.className = 'text-slate-500';
  prerollEndPipe.textContent = '|';
  line.appendChild(prerollEndPipe);
}

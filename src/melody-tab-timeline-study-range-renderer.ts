import {
  computeDraggedMelodyStudyRange,
  resolveTimelineStepIndexFromX,
  type MelodyStudyRangeDragMode,
  type TimelineStepMetric,
} from './melody-study-range-drag';
import { normalizeMelodyStudyRange, type MelodyStudyRange } from './melody-study-range';
import { scaleTimelinePixels } from './melody-tab-timeline-render-utils';

export function getRenderedTimelineStepMetrics(root: HTMLElement): TimelineStepMetric[] {
  const wrapperRect = root.getBoundingClientRect();
  return Array.from(root.querySelectorAll<HTMLElement>('[data-timeline-step-anchor="true"]')).map((element) => {
    const rect = element.getBoundingClientRect();
    return {
      index: Number.parseInt(element.dataset.eventIndex ?? '0', 10) || 0,
      left: rect.left - wrapperRect.left,
      right: rect.right - wrapperRect.left,
    };
  });
}

export function renderStudyRangeBar(
  root: HTMLElement,
  melodyId: string,
  totalEvents: number,
  metrics: TimelineStepMetric[],
  studyRange: MelodyStudyRange,
  zoomScale: number,
  onMelodyStudyRangeCommit: ((payload: { melodyId: string; range: MelodyStudyRange }) => void) | null
) {
  if (metrics.length === 0 || totalEvents <= 0) return;

  const normalizedRange = normalizeMelodyStudyRange(studyRange, totalEvents);
  const totalWidth = Math.max(0, metrics[metrics.length - 1]!.right);
  const trackStart = metrics[0]!.left;
  const trackEnd = metrics[metrics.length - 1]!.right;
  const trackWidth = Math.max(1, trackEnd - trackStart);

  const wrapper = document.createElement('div');
  wrapper.className = 'mb-2 min-w-max select-none';
  wrapper.dataset.timelineRangeUi = 'true';

  const lane = document.createElement('div');
  lane.className = 'relative h-8';
  lane.style.height = `${scaleTimelinePixels(32, zoomScale, 24)}px`;
  lane.style.width = `${totalWidth}px`;
  wrapper.appendChild(lane);

  const track = document.createElement('div');
  track.className = 'absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-slate-800 border border-slate-700/80';
  track.style.height = `${scaleTimelinePixels(8, zoomScale, 6)}px`;
  track.style.left = `${trackStart}px`;
  track.style.width = `${trackWidth}px`;
  lane.appendChild(track);

  const selection = document.createElement('div');
  selection.className =
    'absolute top-1/2 h-4 -translate-y-1/2 rounded-full border border-amber-400/80 bg-amber-500/20 shadow-[0_0_0_1px_rgba(251,191,36,0.15)] cursor-grab';
  selection.style.height = `${scaleTimelinePixels(16, zoomScale, 12)}px`;
  selection.style.touchAction = 'none';
  selection.dataset.timelineNoPan = 'true';
  lane.appendChild(selection);

  const createHandle = (side: 'left' | 'right') => {
    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className =
      'absolute top-1/2 h-6 w-3 -translate-y-1/2 rounded-sm border border-amber-300/80 bg-amber-200 text-[0] shadow-sm cursor-ew-resize';
    handle.style.height = `${scaleTimelinePixels(24, zoomScale, 18)}px`;
    handle.style.width = `${scaleTimelinePixels(12, zoomScale, 9)}px`;
    handle.style.touchAction = 'none';
    handle.dataset.timelineNoPan = 'true';
    handle.setAttribute('aria-label', side === 'left' ? 'Adjust study range start' : 'Adjust study range end');
    lane.appendChild(handle);
    return handle;
  };

  const leftHandle = createHandle('left');
  const rightHandle = createHandle('right');

  const applyVisualRange = (range: MelodyStudyRange) => {
    const startMetric = metrics[range.startIndex] ?? metrics[0]!;
    const endMetric = metrics[range.endIndex] ?? metrics[metrics.length - 1]!;
    const left = startMetric.left;
    const width = Math.max(12, endMetric.right - startMetric.left);
    const handleOffset = scaleTimelinePixels(6, zoomScale, 4);
    selection.style.left = `${left}px`;
    selection.style.width = `${Math.max(scaleTimelinePixels(12, zoomScale, 8), width)}px`;
    leftHandle.style.left = `${startMetric.left - handleOffset}px`;
    rightHandle.style.left = `${endMetric.right - handleOffset}px`;
  };

  applyVisualRange(normalizedRange);

  const startDrag = (mode: MelodyStudyRangeDragMode, event: PointerEvent) => {
    event.preventDefault();
    const pointerX = event.clientX - root.getBoundingClientRect().left;
    const anchorIndex = resolveTimelineStepIndexFromX(metrics, pointerX);
    const anchorOffset = anchorIndex - normalizedRange.startIndex;
    let previewRange = normalizedRange;

    selection.classList.add('cursor-grabbing');

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const x = moveEvent.clientX - root.getBoundingClientRect().left;
      const hoveredIndex = resolveTimelineStepIndexFromX(metrics, x);
      previewRange = computeDraggedMelodyStudyRange(
        mode,
        normalizedRange,
        hoveredIndex,
        totalEvents,
        mode === 'move' ? anchorOffset : 0
      );
      applyVisualRange(previewRange);
    };

    const finishDrag = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      selection.classList.remove('cursor-grabbing');
      applyVisualRange(previewRange);
      if (
        previewRange.startIndex !== normalizedRange.startIndex ||
        previewRange.endIndex !== normalizedRange.endIndex
      ) {
        onMelodyStudyRangeCommit?.({ melodyId, range: previewRange });
      }
    };

    const handlePointerUp = () => {
      finishDrag();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  leftHandle.addEventListener('pointerdown', (event) => startDrag('start', event));
  rightHandle.addEventListener('pointerdown', (event) => startDrag('end', event));
  selection.addEventListener('pointerdown', (event) => {
    const target = event.target as HTMLElement | null;
    if (target === leftHandle || target === rightHandle) return;
    startDrag('move', event);
  });

  root.prepend(wrapper);
}

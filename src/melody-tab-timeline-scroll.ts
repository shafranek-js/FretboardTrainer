import { dom } from './state';
import { getMelodyEventPlaybackDurationMs } from './melody-timeline-duration';
import type { MelodyDefinition } from './melody-library';
import type { MelodyStudyRange } from './melody-study-range';
import {
  resolveTimelineRuntimeCenterX,
  resolveTimelineRuntimeCursorState,
  type RuntimeTimelineEventPoint,
} from './melody-tab-timeline-runtime-follow';

let timelineScrollChromeBound = false;
let timelinePanBound = false;
let lastRuntimePointsKey = '';
let lastRuntimePoints: RuntimeTimelineEventPoint[] = [];
let timelineCenterAnimationFrameId: number | null = null;
let timelineCenterAnimationTargetLeft = 0;
let timelineRuntimeFollowFrameId: number | null = null;
let timelineRuntimeFollowTargetLeft = 0;
const lastScrollChromeState = {
  scrollable: '',
  scrollLeft: '',
  scrollRight: '',
};

function cancelTimelineCenterAnimation() {
  if (timelineCenterAnimationFrameId !== null) {
    window.cancelAnimationFrame(timelineCenterAnimationFrameId);
    timelineCenterAnimationFrameId = null;
  }
}

function cancelTimelineRuntimeFollowAnimation() {
  if (timelineRuntimeFollowFrameId !== null) {
    window.cancelAnimationFrame(timelineRuntimeFollowFrameId);
    timelineRuntimeFollowFrameId = null;
  }
}

function startTimelineCenterFollowLoop() {
  if (timelineCenterAnimationFrameId !== null) return;
  const scroller = dom.melodyTabTimelineGrid;
  let lastTimestamp = performance.now();

  const tick = (now: number) => {
    const dtMs = Math.max(8, Math.min(34, now - lastTimestamp));
    lastTimestamp = now;

    const distance = timelineCenterAnimationTargetLeft - scroller.scrollLeft;
    if (Math.abs(distance) <= 0.5) {
      scroller.scrollLeft = timelineCenterAnimationTargetLeft;
      timelineCenterAnimationFrameId = null;
      return;
    }

    const catchup = 1 - Math.pow(0.08, dtMs / 16.67);
    scroller.scrollLeft += distance * catchup;
    timelineCenterAnimationFrameId = window.requestAnimationFrame(tick);
  };

  timelineCenterAnimationFrameId = window.requestAnimationFrame(tick);
}

export function centerTimelineEvent(eventIndex: number, behavior: ScrollBehavior = 'smooth') {
  if (!Number.isFinite(eventIndex) || eventIndex < 0) return;
  const scroller = dom.melodyTabTimelineGrid;
  const anchor = scroller.querySelector<HTMLElement>(
    `[data-timeline-step-anchor="true"][data-event-index="${eventIndex}"]`
  );
  if (!anchor) return;

  const anchorLeft = anchor.offsetLeft;
  const targetLeft = anchorLeft - (scroller.clientWidth - anchor.clientWidth) / 2;
  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const clampedTargetLeft = Math.max(0, Math.min(maxScrollLeft, targetLeft));

  if (behavior !== 'smooth') {
    cancelTimelineCenterAnimation();
    cancelTimelineRuntimeFollowAnimation();
    scroller.scrollLeft = clampedTargetLeft;
    return;
  }
  cancelTimelineRuntimeFollowAnimation();
  timelineCenterAnimationTargetLeft = clampedTargetLeft;
  startTimelineCenterFollowLoop();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function startTimelineRuntimeFollowLoop() {
  if (timelineRuntimeFollowFrameId !== null) return;
  const scroller = dom.melodyTabTimelineGrid;
  let lastTimestamp = performance.now();

  const tick = (now: number) => {
    if (document.body.classList.contains('timeline-pan-active')) {
      timelineRuntimeFollowFrameId = null;
      return;
    }

    const dtMs = Math.max(8, Math.min(34, now - lastTimestamp));
    lastTimestamp = now;
    const distance = timelineRuntimeFollowTargetLeft - scroller.scrollLeft;

    if (Math.abs(distance) <= 0.2) {
      scroller.scrollLeft = timelineRuntimeFollowTargetLeft;
      timelineRuntimeFollowFrameId = null;
      return;
    }

    const catchup = 1 - Math.pow(0.78, dtMs / 16.67);
    scroller.scrollLeft += distance * catchup;
    timelineRuntimeFollowFrameId = window.requestAnimationFrame(tick);
  };

  timelineRuntimeFollowFrameId = window.requestAnimationFrame(tick);
}

export function followTimelineRuntimeCursor(
  melody: Pick<MelodyDefinition, 'events'>,
  bpm: number,
  studyRange: MelodyStudyRange,
  currentTimeSec: number,
  leadInSec = 0
) {
  const scroller = dom.melodyTabTimelineGrid;
  const playhead = dom.melodyTabTimelinePlayhead;
  if (document.body.classList.contains('timeline-pan-active')) return null;
  const runtimePointsKey = JSON.stringify({
    melodyId: scroller.dataset.melodyId ?? '',
    renderEpoch: scroller.dataset.renderEpoch ?? '',
    melodyEventCount: melody.events.length,
    bpm,
    studyRange,
    leadInSec,
    scrollWidth: scroller.scrollWidth,
    clientWidth: scroller.clientWidth,
  });
  let points = lastRuntimePoints;
  if (runtimePointsKey !== lastRuntimePointsKey) {
    lastRuntimePointsKey = runtimePointsKey;
    const anchorElements = Array.from(
      scroller.querySelectorAll<HTMLElement>('[data-timeline-step-anchor="true"][data-event-index]')
    );
    const anchorByEventIndex = new Map<number, HTMLElement>();
    anchorElements.forEach((element) => {
      const eventIndex = Number.parseInt(element.dataset.eventIndex ?? '-1', 10);
      if (Number.isInteger(eventIndex) && eventIndex >= 0) {
        anchorByEventIndex.set(eventIndex, element);
      }
    });

    let cursorSec = Math.max(0, leadInSec);
    points = [];
    for (let eventIndex = studyRange.startIndex; eventIndex <= studyRange.endIndex; eventIndex += 1) {
      const anchor = anchorByEventIndex.get(eventIndex);
      const melodyEvent = melody.events[eventIndex];
      if (!anchor || !melodyEvent) continue;
      const durationSec = getMelodyEventPlaybackDurationMs(melodyEvent, bpm, melody) / 1000;
      points.push({
        eventIndex,
        startTimeSec: cursorSec,
        endTimeSec: cursorSec + durationSec,
        travelStartX: anchor.offsetLeft,
        travelEndX: anchor.offsetLeft + anchor.offsetWidth,
        leftX: anchor.offsetLeft,
        rightX: anchor.offsetLeft + anchor.offsetWidth,
        centerX: anchor.offsetLeft + anchor.offsetWidth / 2,
      });
      cursorSec += durationSec;
    }
    for (let index = 0; index < points.length - 1; index += 1) {
      const currentPoint = points[index];
      const nextPoint = points[index + 1];
      if (!currentPoint || !nextPoint) continue;
      currentPoint.travelEndX = nextPoint.travelStartX;
    }
    lastRuntimePoints = points;
  }
  if (points.length === 0) {
    playhead.style.opacity = '0';
    return null;
  }

  const { centerX, activeEventIndex } = resolveTimelineRuntimeCursorState(currentTimeSec, leadInSec, points);
  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const followThresholdX = scroller.clientWidth * 0.5;
  const targetLeft = clamp(centerX - followThresholdX, 0, maxScrollLeft);
  if (Math.abs(scroller.scrollLeft - targetLeft) >= 0.5) {
    scroller.scrollLeft = targetLeft;
  }
  playhead.style.left = `${centerX - scroller.scrollLeft}px`;
  playhead.style.opacity = '1';
  return activeEventIndex;
}

export function followTimelineRuntimeScroll(
  melody: Pick<MelodyDefinition, 'events'>,
  bpm: number,
  studyRange: MelodyStudyRange,
  currentTimeSec: number,
  leadInSec = 0
) {
  const scroller = dom.melodyTabTimelineGrid;
  if (document.body.classList.contains('timeline-pan-active')) return;
  const runtimePointsKey = JSON.stringify({
    melodyId: scroller.dataset.melodyId ?? '',
    renderEpoch: scroller.dataset.renderEpoch ?? '',
    melodyEventCount: melody.events.length,
    bpm,
    studyRange,
    leadInSec,
    scrollWidth: scroller.scrollWidth,
    clientWidth: scroller.clientWidth,
  });
  let points = lastRuntimePoints;
  if (runtimePointsKey !== lastRuntimePointsKey) {
    lastRuntimePointsKey = runtimePointsKey;
    const anchorElements = Array.from(
      scroller.querySelectorAll<HTMLElement>('[data-timeline-step-anchor="true"][data-event-index]')
    );
    const anchorByEventIndex = new Map<number, HTMLElement>();
    anchorElements.forEach((element) => {
      const eventIndex = Number.parseInt(element.dataset.eventIndex ?? '-1', 10);
      if (Number.isInteger(eventIndex) && eventIndex >= 0) {
        anchorByEventIndex.set(eventIndex, element);
      }
    });

    let cursorSec = Math.max(0, leadInSec);
    points = [];
    for (let eventIndex = studyRange.startIndex; eventIndex <= studyRange.endIndex; eventIndex += 1) {
      const anchor = anchorByEventIndex.get(eventIndex);
      const melodyEvent = melody.events[eventIndex];
      if (!anchor || !melodyEvent) continue;
      const durationSec = getMelodyEventPlaybackDurationMs(melodyEvent, bpm, melody) / 1000;
      points.push({
        eventIndex,
        startTimeSec: cursorSec,
        endTimeSec: cursorSec + durationSec,
        travelStartX: anchor.offsetLeft,
        travelEndX: anchor.offsetLeft + anchor.offsetWidth,
        leftX: anchor.offsetLeft,
        rightX: anchor.offsetLeft + anchor.offsetWidth,
        centerX: anchor.offsetLeft + anchor.offsetWidth / 2,
      });
      cursorSec += durationSec;
    }
    for (let index = 0; index < points.length - 1; index += 1) {
      const currentPoint = points[index];
      const nextPoint = points[index + 1];
      if (!currentPoint || !nextPoint) continue;
      currentPoint.travelEndX = nextPoint.travelStartX;
    }
    lastRuntimePoints = points;
  }
  if (points.length === 0) return;

  const centerX = resolveTimelineRuntimeCenterX(currentTimeSec, leadInSec, points);
  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const followThresholdX = scroller.clientWidth * 0.5;
  const targetLeft = clamp(centerX - followThresholdX, 0, maxScrollLeft);
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cancelTimelineRuntimeFollowAnimation();
    scroller.scrollLeft = targetLeft;
    return;
  }
  cancelTimelineCenterAnimation();
  timelineRuntimeFollowTargetLeft = targetLeft;
  startTimelineRuntimeFollowLoop();
}

export function updateTimelineScrollChrome() {
  const viewport = dom.melodyTabTimelineViewport;
  const scroller = dom.melodyTabTimelineGrid;
  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const isScrollable = maxScrollLeft > 4;
  const hasLeftOverflow = isScrollable && scroller.scrollLeft > 2;
  const hasRightOverflow = isScrollable && scroller.scrollLeft < maxScrollLeft - 2;

  const nextScrollable = isScrollable ? 'true' : 'false';
  const nextScrollLeft = hasLeftOverflow ? 'true' : 'false';
  const nextScrollRight = hasRightOverflow ? 'true' : 'false';

  if (lastScrollChromeState.scrollable !== nextScrollable) {
    viewport.dataset.scrollable = nextScrollable;
    lastScrollChromeState.scrollable = nextScrollable;
  }
  if (lastScrollChromeState.scrollLeft !== nextScrollLeft) {
    viewport.dataset.scrollLeft = nextScrollLeft;
    lastScrollChromeState.scrollLeft = nextScrollLeft;
  }
  if (lastScrollChromeState.scrollRight !== nextScrollRight) {
    viewport.dataset.scrollRight = nextScrollRight;
    lastScrollChromeState.scrollRight = nextScrollRight;
  }
}

export function bindTimelineScrollChrome() {
  if (timelineScrollChromeBound) return;
  timelineScrollChromeBound = true;

  dom.melodyTabTimelineGrid.addEventListener(
    'scroll',
    () => {
      updateTimelineScrollChrome();
    },
    { passive: true }
  );

  window.addEventListener(
    'resize',
    () => {
      updateTimelineScrollChrome();
    },
    { passive: true }
  );
}

export function bindTimelineDragPan() {
  if (timelinePanBound) return;
  timelinePanBound = true;

  const scroller = dom.melodyTabTimelineGrid;
  let pointerId: number | null = null;
  let startClientX = 0;
  let startScrollLeft = 0;
  let isDragging = false;
  let lastClientX = 0;
  let lastTimestamp = 0;
  let velocityPxPerMs = 0;
  let inertiaFrameId: number | null = null;

  const cancelInertia = () => {
    if (inertiaFrameId !== null) {
      window.cancelAnimationFrame(inertiaFrameId);
      inertiaFrameId = null;
    }
  };

  const startInertia = () => {
    if (Math.abs(velocityPxPerMs) < 0.01) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    cancelInertia();
    let currentVelocity = velocityPxPerMs;
    let frameTimestamp = performance.now();

    const tick = (timestamp: number) => {
      const dt = Math.min(34, Math.max(8, timestamp - frameTimestamp));
      frameTimestamp = timestamp;
      if (Math.abs(currentVelocity) < 0.01) {
        cancelInertia();
        return;
      }

      const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      const previousScrollLeft = scroller.scrollLeft;
      const nextScrollLeft = Math.max(0, Math.min(maxScrollLeft, previousScrollLeft + currentVelocity * dt));
      scroller.scrollLeft = nextScrollLeft;

      if (Math.abs(nextScrollLeft - previousScrollLeft) < 0.1) {
        cancelInertia();
        return;
      }

      currentVelocity *= Math.pow(0.92, dt / 16);
      inertiaFrameId = window.requestAnimationFrame(tick);
    };

    inertiaFrameId = window.requestAnimationFrame(tick);
  };

  const finishDrag = () => {
    pointerId = null;
    isDragging = false;
    scroller.classList.remove('is-drag-panning');
    document.body.classList.remove('timeline-pan-active');
  };

  scroller.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'touch') return;
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    const forcePan = event.ctrlKey || event.metaKey;
    if (!forcePan && target?.closest('[data-timeline-no-pan="true"]')) return;
    if (!forcePan && target?.closest('button, input, select, textarea, a')) return;
    if (scroller.scrollWidth <= scroller.clientWidth + 4) return;

    cancelInertia();
    cancelTimelineCenterAnimation();
    cancelTimelineRuntimeFollowAnimation();
    pointerId = event.pointerId;
    startClientX = event.clientX;
    startScrollLeft = scroller.scrollLeft;
    lastClientX = event.clientX;
    lastTimestamp = event.timeStamp;
    velocityPxPerMs = 0;
    isDragging = false;
    document.body.classList.add('timeline-pan-active');
    scroller.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  scroller.addEventListener('pointermove', (event) => {
    if (pointerId !== event.pointerId) return;
    const deltaX = event.clientX - startClientX;
    if (!isDragging && Math.abs(deltaX) < 3) return;
    isDragging = true;
    scroller.classList.add('is-drag-panning');
    scroller.scrollLeft = startScrollLeft - deltaX;
    const dt = Math.max(1, event.timeStamp - lastTimestamp);
    const clientDelta = event.clientX - lastClientX;
    velocityPxPerMs = -clientDelta / dt;
    lastClientX = event.clientX;
    lastTimestamp = event.timeStamp;
    event.preventDefault();
  });

  scroller.addEventListener('pointerup', (event) => {
    if (pointerId !== event.pointerId) return;
    if (scroller.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
    const shouldInertia = isDragging;
    finishDrag();
    if (shouldInertia) {
      startInertia();
    }
  });

  scroller.addEventListener('pointercancel', (event) => {
    if (pointerId !== event.pointerId) return;
    if (scroller.hasPointerCapture(event.pointerId)) {
      scroller.releasePointerCapture(event.pointerId);
    }
    finishDrag();
    cancelInertia();
  });

  scroller.addEventListener('dblclick', (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-timeline-no-pan="true"]')) return;
    const activeEventIndex = Number.parseInt(scroller.dataset.activeEventIndex ?? '-1', 10);
    if (!Number.isFinite(activeEventIndex) || activeEventIndex < 0) return;
    centerTimelineEvent(activeEventIndex);
  });
}

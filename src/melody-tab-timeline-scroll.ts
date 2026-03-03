import { dom } from './state';

let timelineScrollChromeBound = false;
let timelinePanBound = false;

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
  scroller.scrollTo({
    left: Math.max(0, Math.min(maxScrollLeft, targetLeft)),
    behavior,
  });
}

export function updateTimelineScrollChrome() {
  const viewport = dom.melodyTabTimelineViewport;
  const scroller = dom.melodyTabTimelineGrid;
  const maxScrollLeft = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
  const isScrollable = maxScrollLeft > 4;
  const hasLeftOverflow = isScrollable && scroller.scrollLeft > 2;
  const hasRightOverflow = isScrollable && scroller.scrollLeft < maxScrollLeft - 2;

  viewport.dataset.scrollable = isScrollable ? 'true' : 'false';
  viewport.dataset.scrollLeft = hasLeftOverflow ? 'true' : 'false';
  viewport.dataset.scrollRight = hasRightOverflow ? 'true' : 'false';
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

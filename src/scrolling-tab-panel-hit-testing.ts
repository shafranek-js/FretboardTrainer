import type { ScrollingTabPanelLayout } from './scrolling-tab-panel-geometry';
import type { ScrollingTabPanelEvent, ScrollingTabPanelModel } from './scrolling-tab-panel-model';

export type ScrollingTabPanelHitTarget =
  | {
      kind: 'note';
      eventIndex: number;
      noteIndex: number;
      stringName: string;
      fret: number;
    }
  | {
      kind: 'event';
      eventIndex: number;
    }
  | {
      kind: 'empty-cell';
      eventIndex: number;
      stringIndex: number;
      stringName: string;
    }
  | null;

function getStringIndexAtY(
  y: number,
  layout: Pick<ScrollingTabPanelLayout, 'neckTopY' | 'neckHeight' | 'stringYs'>
) {
  if (y < layout.neckTopY || y > layout.neckTopY + layout.neckHeight) {
    return null;
  }
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  layout.stringYs.forEach((stringY, index) => {
    const distance = Math.abs(y - stringY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

export function getScrollingTabPanelEventWidth(
  event: Pick<ScrollingTabPanelEvent, 'durationSec'>,
  model: Pick<ScrollingTabPanelModel, 'minDurationSec'>,
  layout: Pick<ScrollingTabPanelLayout, 'baseNoteWidth' | 'pixelsPerSecond'>
) {
  return layout.baseNoteWidth + Math.max(0, (event.durationSec - model.minDurationSec) * layout.pixelsPerSecond);
}

export function getScrollingTabPanelEventX(
  event: Pick<ScrollingTabPanelEvent, 'startTimeSec'>,
  layout: Pick<ScrollingTabPanelLayout, 'playheadX' | 'pixelsPerSecond' | 'currentScrollX'>
) {
  return layout.playheadX + event.startTimeSec * layout.pixelsPerSecond - layout.currentScrollX;
}

export function resolveScrollingTabPanelClosestEventIndex(
  x: number,
  model: Pick<ScrollingTabPanelModel, 'events' | 'minDurationSec'>,
  layout: Pick<ScrollingTabPanelLayout, 'playheadX' | 'pixelsPerSecond' | 'currentScrollX' | 'baseNoteWidth'>
) {
  const closestEvent = model.events.reduce<{ index: number; distance: number } | null>((best, event) => {
    const eventX = getScrollingTabPanelEventX(event, layout);
    const eventWidth = getScrollingTabPanelEventWidth(event, model, layout);
    const centerX = eventX + eventWidth / 2;
    const distance = Math.abs(x - centerX);
    if (!best || distance < best.distance) {
      return { index: event.index, distance };
    }
    return best;
  }, null);
  return closestEvent?.index ?? null;
}

export function resolveScrollingTabPanelHitTarget(
  x: number,
  y: number,
  model: Pick<ScrollingTabPanelModel, 'events' | 'minDurationSec' | 'stringNames'>,
  layout: Pick<
    ScrollingTabPanelLayout,
    'playheadX' | 'pixelsPerSecond' | 'currentScrollX' | 'baseNoteWidth' | 'stringYs' | 'noteHeight' | 'neckTopY' | 'neckHeight'
  >
): ScrollingTabPanelHitTarget {
  const stringIndex = getStringIndexAtY(y, layout);

  for (const event of model.events) {
    const eventX = getScrollingTabPanelEventX(event, layout);
    const eventWidth = getScrollingTabPanelEventWidth(event, model, layout);
    if (x < eventX || x > eventX + eventWidth) continue;

    for (const note of event.notes) {
      const noteY = layout.stringYs[note.stringIndex] ?? layout.stringYs[0] ?? 0;
      const noteTop = noteY - layout.noteHeight / 2;
      const noteBottom = noteTop + layout.noteHeight;
      if (y >= noteTop && y <= noteBottom) {
        return {
          kind: 'note',
          eventIndex: event.index,
          noteIndex: note.noteIndex,
          stringName: note.stringName,
          fret: note.fret,
        };
      }
    }

    if (stringIndex !== null) {
      const occupied = event.notes.some((note) => note.stringIndex === stringIndex);
      const stringName = model.stringNames[stringIndex] ?? null;
      if (!occupied && stringName) {
        return {
          kind: 'empty-cell',
          eventIndex: event.index,
          stringIndex,
          stringName,
        };
      }
    }

    return {
      kind: 'event',
      eventIndex: event.index,
    };
  }

  return null;
}

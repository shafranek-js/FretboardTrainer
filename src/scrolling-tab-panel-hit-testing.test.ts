import { describe, expect, it } from 'vitest';
import { computeScrollingTabPanelLayout } from './scrolling-tab-panel-geometry';
import {
  getScrollingTabPanelEventWidth,
  getScrollingTabPanelEventX,
  resolveScrollingTabPanelClosestEventIndex,
  resolveScrollingTabPanelHitTarget,
} from './scrolling-tab-panel-hit-testing';
import type { ScrollingTabPanelModel } from './scrolling-tab-panel-model';

const model: ScrollingTabPanelModel = {
  stringCount: 6,
  stringNames: ['e', 'B', 'G', 'D', 'A', 'E'],
  events: [
    {
      index: 0,
      barIndex: 0,
      startTimeSec: 1,
      durationSec: 0.5,
      isChord: false,
      notes: [{ noteIndex: 0, stringIndex: 0, stringName: 'e', fret: 0, note: 'E', finger: 0, performanceStatus: null }],
    },
    {
      index: 1,
      barIndex: 0,
      startTimeSec: 1.5,
      durationSec: 0.5,
      isChord: false,
      notes: [{ noteIndex: 0, stringIndex: 1, stringName: 'B', fret: 3, note: 'D', finger: 1, performanceStatus: null }],
    },
  ],
  barMarkers: [],
  totalDurationSec: 3,
  currentTimeSec: 1,
  activeEventIndex: null,
  minDurationSec: 0.5,
  leadInSec: 1,
};

describe('scrolling-tab-panel-hit-testing', () => {
  const layout = computeScrollingTabPanelLayout({
    width: 900,
    height: 220,
    stringCount: model.stringCount,
    model,
    zoomScale: 1,
  });

  it('resolves note hits using event note geometry', () => {
    const firstEvent = model.events[0]!;
    const eventX = getScrollingTabPanelEventX(firstEvent, layout);
    const eventWidth = getScrollingTabPanelEventWidth(firstEvent, model, layout);
    const y = layout.stringYs[0]!;

    expect(
      resolveScrollingTabPanelHitTarget(eventX + eventWidth / 2, y, model, layout)
    ).toEqual({
      kind: 'note',
      eventIndex: 0,
      noteIndex: 0,
      stringName: 'e',
      fret: 0,
    });
  });

  it('resolves empty string lanes inside an event span for add-note actions', () => {
    const firstEvent = model.events[0]!;
    const eventX = getScrollingTabPanelEventX(firstEvent, layout);
    const eventWidth = getScrollingTabPanelEventWidth(firstEvent, model, layout);
    const y = layout.stringYs[1]!;

    expect(
      resolveScrollingTabPanelHitTarget(eventX + eventWidth / 2, y, model, layout)
    ).toEqual({
      kind: 'empty-cell',
      eventIndex: 0,
      stringIndex: 1,
      stringName: 'B',
    });
  });

  it('resolves closest event index for horizontal event dragging', () => {
    const secondEvent = model.events[1]!;
    const eventX = getScrollingTabPanelEventX(secondEvent, layout);
    const eventWidth = getScrollingTabPanelEventWidth(secondEvent, model, layout);

    expect(resolveScrollingTabPanelClosestEventIndex(eventX + eventWidth / 2, model, layout)).toBe(1);
  });
});

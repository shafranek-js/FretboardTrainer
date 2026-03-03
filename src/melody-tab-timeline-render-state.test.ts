import { describe, expect, it } from 'vitest';
import {
  buildMelodyTimelineMetaText,
  buildMelodyTimelineRenderKey,
  resolveMelodyTimelineRenderOptions,
} from './melody-tab-timeline-render-state';

describe('melody-tab-timeline-render-state', () => {
  it('normalizes render options with stable defaults and zoom clamp', () => {
    const resolved = resolveMelodyTimelineRenderOptions(
      {
        modeLabel: '  Session  ',
        zoomScale: 4,
      },
      { startIndex: 2, endIndex: 5 }
    );

    expect(resolved).toEqual({
      modeLabel: 'Session',
      viewMode: 'classic',
      zoomScale: 1.7,
      bpm: null,
      studyRange: { startIndex: 2, endIndex: 5 },
      showStepNumbers: false,
      showMetaDetails: false,
      minimapRangeEditor: true,
      showPrerollLeadIn: false,
      activePrerollStepIndex: null,
      currentTimeSec: null,
      leadInSec: 0,
      editingEnabled: false,
      selectedEventIndex: null,
      selectedNoteIndex: null,
      performanceFeedbackByEvent: null,
    });
  });

  it('builds a render key that changes when feedback and drag state change', () => {
    const options = resolveMelodyTimelineRenderOptions(
      {
        performanceFeedbackByEvent: {
          1: [{ note: 'E', stringName: 'e', fret: 0, status: 'correct' }],
        },
      },
      { startIndex: 0, endIndex: 3 }
    );
    const baseInput = {
      melody: {
        id: 'builtin:guitar:test',
        events: [{ notes: [] }, { notes: [] }, { notes: [] }, { notes: [] }],
      },
      stringOrder: ['e', 'B', 'G', 'D', 'A', 'E'],
      melodyContentSignature: 'abc123',
      model: { activeEventIndex: 1 },
      barGrouping: {
        source: 'duration' as const,
        hasBeatTiming: true,
        beatsPerBar: 4,
        totalBars: 2,
        barStartEventIndexes: new Set<number>([2]),
      },
      durationLayout: {
        source: 'beats' as const,
        hasDurationData: true,
        weights: [1, 1, 1, 1],
        cellCharWidths: [4, 4, 4, 4],
        cellPixelWidths: [44, 44, 44, 44],
      },
      studyRange: { startIndex: 0, endIndex: 3 },
      contextMenuSignature: 'menu:closed',
      activeTimelineNoteDragSource: null,
    };

    const withoutDrag = buildMelodyTimelineRenderKey(baseInput, options);
    const withDrag = buildMelodyTimelineRenderKey(
      {
        ...baseInput,
        activeTimelineNoteDragSource: { eventIndex: 1, noteIndex: 0 },
      },
      options
    );

    expect(withDrag).not.toBe(withoutDrag);
    expect(withoutDrag).toContain('1:correct-E-e-0');
  });

  it('builds meta text with duration and bar info when details are enabled', () => {
    const metaText = buildMelodyTimelineMetaText({
      modeLabel: 'Session',
      viewMode: 'classic',
      model: { activeEventIndex: 2, totalEvents: 8 },
      barGrouping: {
        source: 'duration',
        hasBeatTiming: true,
        beatsPerBar: 4,
        totalBars: 2,
        barStartEventIndexes: new Set<number>([4]),
      },
      durationLayout: {
        source: 'mixed',
        hasDurationData: true,
        weights: [1],
        cellCharWidths: [4],
        cellPixelWidths: [44],
      },
      studyRangeText: ' | Study: Full melody (8 steps)',
      showMetaDetails: true,
    });

    expect(metaText).toBe(
      'Session | Classic TAB | Step 3/8 | 2 bars (4/4) | Duration: mixed | Study: Full melody (8 steps)'
    );
  });
});

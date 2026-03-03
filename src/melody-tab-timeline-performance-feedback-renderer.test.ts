import { describe, expect, it } from 'vitest';
import {
  appendGridTimelinePlayedFeedback,
  buildClassicTimelineFeedbackSegment,
} from './melody-tab-timeline-performance-feedback-renderer';
import type { TimelineCell } from './melody-tab-timeline-model';

class FakeElement {
  children: FakeElement[] = [];
  className = '';
  textContent = '';
  title = '';
  style: Record<string, string> = {};
  dataset: Record<string, string> = {};

  appendChild(child: FakeElement) {
    this.children.push(child);
    return child;
  }

  constructor(public readonly tagName: string) {}
}

function withFakeDocument<T>(callback: () => T) {
  const originalDocument = globalThis.document;
  const fakeDocument = {
    createElement: (tagName: string) => new FakeElement(tagName.toLowerCase()),
  } as unknown as Document;
  Object.defineProperty(globalThis, 'document', {
    value: fakeDocument,
    configurable: true,
    writable: true,
  });
  try {
    return callback();
  } finally {
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      configurable: true,
      writable: true,
    });
  }
}

function buildCell(): TimelineCell {
  return {
    eventIndex: 0,
    isActive: false,
    isInStudyRange: false,
    isStudyRangeStart: false,
    isStudyRangeEnd: false,
    notes: [
      {
        note: 'E',
        stringName: 'e',
        fret: 0,
        finger: 0,
        noteIndex: 0,
        performanceStatus: null,
      },
    ],
    playedNotes: [],
    unmatchedPlayedNotes: [
      {
        note: 'F',
        stringName: 'e',
        fret: 1,
        status: 'wrong',
      },
      {
        note: 'G',
        stringName: 'e',
        fret: 3,
        status: 'missed',
      },
    ],
  };
}

describe('melody-tab-timeline-performance-feedback-renderer', () => {
  it('builds classic feedback segment from unmatched played notes', () => {
    expect(buildClassicTimelineFeedbackSegment(buildCell(), 5)).toBe('1/3--');
  });

  it('appends feedback chips for grid timeline stacks', () => {
    withFakeDocument(() => {
      const stack = new FakeElement('div');
      appendGridTimelinePlayedFeedback(
        stack as unknown as HTMLElement,
        buildCell().unmatchedPlayedNotes,
        1
      );

      const chips = Array.from(stack.children);
      expect(chips).toHaveLength(2);
      expect(chips[0]?.textContent).toBe('1');
      expect(chips[1]?.textContent).toBe('3');
      expect(chips[0]?.title).toContain('Wrong');
      expect(chips[1]?.title).toContain('Missed');
    });
  });
});

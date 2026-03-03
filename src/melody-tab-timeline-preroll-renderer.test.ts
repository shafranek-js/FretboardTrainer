import { describe, expect, it } from 'vitest';
import {
  appendClassicTimelinePreroll,
  computeClassicTimelinePrerollLayout,
} from './melody-tab-timeline-preroll-renderer';

class FakeElement {
  children: FakeElement[] = [];
  className = '';
  textContent = '';
  style: Record<string, string> = {};

  appendChild(child: FakeElement) {
    this.children.push(child);
    return child;
  }

  querySelectorAll(tagName: string) {
    const normalized = tagName.toLowerCase();
    return this.children.filter((child) => child.tagName === normalized);
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

describe('melody-tab-timeline-preroll-renderer', () => {
  it('computes classic preroll layout from early event widths', () => {
    expect(computeClassicTimelinePrerollLayout([3, 4, 5, 6, 10], true)).toEqual({
      leadInChars: 16,
      stepCount: 4,
      stepWidth: 4,
    });
    expect(computeClassicTimelinePrerollLayout([1, 1], false)).toEqual({
      leadInChars: 0,
      stepCount: 0,
      stepWidth: 0,
    });
  });

  it('renders highlighted active preroll step into the line', () => {
    withFakeDocument(() => {
      const line = new FakeElement('div');
      appendClassicTimelinePreroll(
        line as unknown as HTMLElement,
        {
          leadInChars: 8,
          stepCount: 4,
          stepWidth: 2,
        },
        2,
        false
      );

      const cells = Array.from(line.querySelectorAll('span'));
      expect(cells).toHaveLength(5);
      expect(cells[2]?.textContent).toBe('--');
      expect(cells[2]?.style.backgroundColor).toBe('rgba(34, 211, 238, 0.24)');
      expect(cells[4]?.textContent).toBe('|');
    });
  });
});

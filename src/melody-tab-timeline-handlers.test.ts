import { describe, expect, it } from 'vitest';
import {
  getMelodyTimelineEmptyCellAddHandler,
  getMelodyTimelineSeekHandler,
  getMelodyTimelineStudyRangeCommitHandler,
  setMelodyTimelineEmptyCellAddHandler,
  setMelodyTimelineSeekHandler,
  setMelodyTimelineStudyRangeCommitHandler,
} from './melody-tab-timeline-handlers';

describe('melody-tab-timeline-handlers', () => {
  it('stores and returns timeline handler callbacks', () => {
    const rangeHandler = () => {};
    const seekHandler = () => {};
    const emptyCellAddHandler = () => {};

    setMelodyTimelineStudyRangeCommitHandler(rangeHandler);
    setMelodyTimelineSeekHandler(seekHandler);
    setMelodyTimelineEmptyCellAddHandler(emptyCellAddHandler);

    expect(getMelodyTimelineStudyRangeCommitHandler()).toBe(rangeHandler);
    expect(getMelodyTimelineSeekHandler()).toBe(seekHandler);
    expect(getMelodyTimelineEmptyCellAddHandler()).toBe(emptyCellAddHandler);
  });

  it('supports clearing handlers back to null', () => {
    setMelodyTimelineStudyRangeCommitHandler(null);
    setMelodyTimelineSeekHandler(null);
    setMelodyTimelineEmptyCellAddHandler(null);

    expect(getMelodyTimelineStudyRangeCommitHandler()).toBeNull();
    expect(getMelodyTimelineSeekHandler()).toBeNull();
    expect(getMelodyTimelineEmptyCellAddHandler()).toBeNull();
  });
});

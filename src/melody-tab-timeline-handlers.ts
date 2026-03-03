import type { MelodyStudyRange } from './melody-study-range';

let onMelodyStudyRangeCommit:
  | ((payload: { melodyId: string; range: MelodyStudyRange }) => void)
  | null = null;
let onMelodyTimelineSeek:
  | ((payload: { melodyId: string; eventIndex: number; commit: boolean }) => void)
  | null = null;
let onMelodyTimelineEmptyCellAdd:
  | ((payload: { melodyId: string; eventIndex: number; stringName: string }) => void)
  | null = null;

export function setMelodyTimelineStudyRangeCommitHandler(
  handler: ((payload: { melodyId: string; range: MelodyStudyRange }) => void) | null
) {
  onMelodyStudyRangeCommit = handler;
}

export function setMelodyTimelineSeekHandler(
  handler: ((payload: { melodyId: string; eventIndex: number; commit: boolean }) => void) | null
) {
  onMelodyTimelineSeek = handler;
}

export function setMelodyTimelineEmptyCellAddHandler(
  handler: ((payload: { melodyId: string; eventIndex: number; stringName: string }) => void) | null
) {
  onMelodyTimelineEmptyCellAdd = handler;
}

export function getMelodyTimelineStudyRangeCommitHandler() {
  return onMelodyStudyRangeCommit;
}

export function getMelodyTimelineSeekHandler() {
  return onMelodyTimelineSeek;
}

export function getMelodyTimelineEmptyCellAddHandler() {
  return onMelodyTimelineEmptyCellAdd;
}

export function emitMelodyTimelineSeek(payload: { melodyId: string; eventIndex: number; commit: boolean }) {
  onMelodyTimelineSeek?.(payload);
}

export function emitMelodyTimelineEmptyCellAdd(payload: { melodyId: string; eventIndex: number; stringName: string }) {
  onMelodyTimelineEmptyCellAdd?.(payload);
}

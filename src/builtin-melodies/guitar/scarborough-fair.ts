import type { BuiltinAsciiTabMelodySpec, BuiltinMelodyEventSpec } from '../types';

const GUITAR_SCARBOROUGH_FAIR_EVENTS: BuiltinMelodyEventSpec[] = [
  { durationBeats: 1, notes: [{ stringName: 'B', fret: 3 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'B', fret: 3 }] },
  { durationBeats: 1, notes: [{ stringName: 'e', fret: 5 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 5 }] },
  { durationBeats: 0.75, notes: [{ stringName: 'e', fret: 0 }] },
  { durationBeats: 0.25, notes: [{ stringName: 'e', fret: 1 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 0 }] },
  { durationBeats: 2, notes: [{ stringName: 'B', fret: 3 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 5 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 8 }] },
  { durationBeats: 1, notes: [{ stringName: 'e', fret: 10 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 8 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 5 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 7 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'B', fret: 8 }] },
  { durationBeats: 2, notes: [{ stringName: 'B', fret: 10 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 1 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 10 }] },
  { durationBeats: 1, notes: [{ stringName: 'e', fret: 10 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 10 }] },
  { durationBeats: 1, notes: [{ stringName: 'e', fret: 8 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 5 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 5 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 3 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 1 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 0 }] },
  { durationBeats: 2, notes: [{ stringName: 'B', fret: 1 }] },
  { durationBeats: 1, notes: [{ stringName: 'B', fret: 3 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 5 }] },
  { durationBeats: 1, notes: [{ stringName: 'e', fret: 3 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 1 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'e', fret: 0 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'B', fret: 3 }] },
  { durationBeats: 0.5, notes: [{ stringName: 'B', fret: 1 }] },
  { durationBeats: 2, notes: [{ stringName: 'B', fret: 3 }] },
];

const GUITAR_SCARBOROUGH_FAIR_TAB_TEXT = `
e|------------5-------5---0-------|1---0-------------------5---8---|10------8---5---7---------------|--------10--10------10--8-------|5---5---3---1---0---------------|------------5---3-------1---0---|------------------------
B|3-------3-----------------------|--------3-----------------------|--------------------8---10------|--------------------------------|--------------------1-----------|----3---------------------------|3---1---3---------------
G|--------------------------------|--------------------------------|--------------------------------|--------------------------------|--------------------------------|--------------------------------|------------------------
D|--------------------------------|--------------------------------|--------------------------------|--------------------------------|--------------------------------|--------------------------------|------------------------
A|--------------------------------|--------------------------------|--------------------------------|--------------------------------|--------------------------------|--------------------------------|------------------------
E|--------------------------------|--------------------------------|--------------------------------|--------------------------------|--------------------------------|--------------------------------|------------------------
count 1   &   2   &   3   &   4   &   |1   &   2   &   3   &   4   &   |1   &   2   &   3   &   4   &   |1   &   2   &   3   &   4   &   |1   &   2   &   3   &   4   &   |1   &   2   &   3   &   4   &   |1   &   2   &   3   &   4
`.trim();

export const GUITAR_SCARBOROUGH_FAIR_MELODY: BuiltinAsciiTabMelodySpec = {
  id: 'builtin:guitar:scarborough_fair',
  name: 'Scarborough Fair',
  instrumentName: 'guitar',
  tabText: GUITAR_SCARBOROUGH_FAIR_TAB_TEXT,
  events: GUITAR_SCARBOROUGH_FAIR_EVENTS,
  sourceTempoBpm: 72,
  sourceTimeSignature: '3/4',
};

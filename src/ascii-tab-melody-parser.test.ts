import { describe, expect, it } from 'vitest';
import {
  parseAsciiTabMelodyEvents,
  parseAsciiTabToMelodyEvents,
  parseAsciiTabToMelodySteps,
} from './ascii-tab-melody-parser';

const guitarLikeInstrument = {
  STRING_ORDER: ['e', 'B', 'G', 'D', 'A', 'E'],
  getNoteWithOctave(stringName: string, fret: number) {
    const baseByString: Record<string, string[]> = {
      e: ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E'],
      B: ['B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G'],
      A: ['A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A'],
      E: ['E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E'],
    };
    const notes = baseByString[stringName];
    if (!notes || !notes[fret]) return null;
    return `${notes[fret]}4`;
  },
};

describe('ascii-tab-melody-parser', () => {
  it('extracts ordered events from russian string labels', () => {
    const events = parseAsciiTabMelodyEvents(
      [
        '1 струна 0---5---8---|7---5---',
        '2 струна ------------|------6-',
        '3 струна ------------|--------',
      ].join('\n')
    );

    expect(events.map(({ stringNumber, fret }) => ({ stringNumber, fret }))).toEqual([
      { stringNumber: 1, fret: 0 },
      { stringNumber: 1, fret: 5 },
      { stringNumber: 1, fret: 8 },
      { stringNumber: 1, fret: 7 },
      { stringNumber: 1, fret: 5 },
      { stringNumber: 2, fret: 6 },
    ]);
  });

  it('supports multi-digit frets and multiple systems', () => {
    const events = parseAsciiTabMelodyEvents(
      [
        '1 string 10--12-|',
        '2 string ------|',
        '',
        '1 string 3--|',
        '2 string --5|',
      ].join('\n')
    );

    expect(events.map((e) => [e.stringNumber, e.fret, e.column])).toEqual([
      [1, 10, 0],
      [1, 12, 4],
      [1, 3, 0],
      [2, 5, 2],
    ]);
  });

  it('converts parsed events to instrument note steps', () => {
    const steps = parseAsciiTabToMelodySteps(
      [
        '1 струна 0---5---8',
        '2 струна --------6',
      ].join('\n'),
      guitarLikeInstrument
    );

    expect(steps).toEqual([
      { note: 'E', stringName: 'e', fret: 0, stringNumber: 1 },
      { note: 'A', stringName: 'e', fret: 5, stringNumber: 1 },
      { note: 'C', stringName: 'e', fret: 8, stringNumber: 1 },
      { note: 'F', stringName: 'B', fret: 6, stringNumber: 2 },
    ]);
  });

  it('groups notes from the same tab column into one melody event', () => {
    const groupedEvents = parseAsciiTabToMelodyEvents(
      [
        '1 string 0---3---',
        '2 string 0-------',
      ].join('\n'),
      guitarLikeInstrument
    );

    expect(groupedEvents).toEqual([
      {
        column: 0,
        durationColumns: 4,
        notes: [
          { note: 'E', stringName: 'e', fret: 0, stringNumber: 1 },
          { note: 'B', stringName: 'B', fret: 0, stringNumber: 2 },
        ],
      },
      {
        column: 4,
        durationColumns: 4,
        notes: [{ note: 'G', stringName: 'e', fret: 3, stringNumber: 1 }],
      },
    ]);
  });

  it('preserves timing gaps as durationColumns for demo playback', () => {
    const groupedEvents = parseAsciiTabToMelodyEvents(
      [
        '1 string 0---------------5-------8-------',
        '2 string --------------------------------',
      ].join('\n'),
      guitarLikeInstrument
    );

    expect(groupedEvents.map((event) => ({ fret: event.notes[0]?.fret, duration: event.durationColumns }))).toEqual([
      { fret: 0, duration: 16 },
      { fret: 5, duration: 8 },
      { fret: 8, duration: 8 },
    ]);
  });

  it('derives beat durations from an aligned count line when present', () => {
    const groupedEvents = parseAsciiTabToMelodyEvents(
      [
        '1 string 0---5---8---',
        '2 string ------------',
        'count    1   and 2   and',
      ].join('\n'),
      guitarLikeInstrument
    );

    expect(groupedEvents.map((event) => event.durationBeats)).toEqual([0.5, 0.5, 0.5]);
    expect(groupedEvents.map((event) => event.durationCountSteps)).toEqual([1, 1, 1]);
  });

  it('does not parse unlabeled count rows that start with digits as tab strings', () => {
    const groupedEvents = parseAsciiTabToMelodyEvents(
      [
        '1 string 0---5---8---',
        '2 string ------------',
        '1   &   2   &   3   &',
      ].join('\n'),
      guitarLikeInstrument
    );

    expect(groupedEvents.map((event) => event.notes[0]?.fret)).toEqual([0, 5, 8]);
  });

  it('throws a user-friendly error when no tab lines are found', () => {
    expect(() => parseAsciiTabMelodyEvents('count 1 and 2 and')).toThrow(/No tab lines found/i);
  });

  it('supports lettered tab lines like E|... and ignores source comments', () => {
    const groupedEvents = parseAsciiTabToMelodyEvents(
      [
        'E|-----------------------------------------------|',
        'B|-----------------------------------------------|',
        'G|-----------------------------------------------|',
        'D|-----------------------------------------------|',
        'A|-3--3--10--10--12--12--10--8--8--7--7--5--5--3-|',
        'E|-1--1--8---8---10--10--8---6--6--5--5--3--3--1-|',
        '[ Tab from: https://www.guitartabs.cc/tabs/m/misc/twinkle_twinkle_little_star_tab.html ]',
        'E|------------------------------------------------|',
        'B|------------------------------------------------|',
        'G|------------------------------------------------|',
        'D|------------------------------------------------|',
        'A|-10--10--8--8--7--7--5----10--10--8--8--7--7--5-|',
        'E|-8---8---6--6--5--5--3----8---8---6--6--5--5--3-|',
      ].join('\n'),
      guitarLikeInstrument
    );

    expect(groupedEvents.length).toBeGreaterThan(10);
    expect(groupedEvents[0]?.notes.map((n) => [n.stringName, n.fret])).toEqual([
      ['A', 3],
      ['E', 1],
    ]);
    expect(groupedEvents[1]?.notes.map((n) => [n.stringName, n.fret])).toEqual([
      ['A', 3],
      ['E', 1],
    ]);
  });

  it('supports lettered tab lines with colon prefix like e:|...', () => {
    const groupedEvents = parseAsciiTabToMelodyEvents(
      [
        'e:|--0---3---|',
        'B:|----------|',
      ].join('\n'),
      guitarLikeInstrument
    );

    expect(groupedEvents.map((event) => event.notes.map((n) => [n.stringName, n.fret]))).toEqual([
      [['e', 0]],
      [['e', 3]],
    ]);
  });

  it('preserves case-sensitive E/e string labels for guitar letter tabs', () => {
    const groupedEvents = parseAsciiTabToMelodyEvents(
      [
        'e|--0--|',
        'E|--1--|',
      ].join('\n'),
      guitarLikeInstrument
    );

    expect(groupedEvents[0]?.notes.map((n) => [n.stringName, n.fret])).toEqual([
      ['e', 0],
      ['E', 1],
    ]);
  });
});

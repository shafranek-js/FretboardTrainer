import { describe, expect, it } from 'vitest';
import { instruments } from './instruments';
import {
  convertAlphaTabScoreToImportedMelody,
  convertLoadedGpScoreTrackToImportedMelody,
  inspectAlphaTabScoreForMelodyImport,
} from './gp-import';

describe('gp-import converter', () => {
  it('converts alphaTab-like score beats into melody events with polyphony and timing gaps', () => {
    const imported = convertAlphaTabScoreToImportedMelody(
      {
        title: 'Test Piece',
        tempo: 100,
        tracks: [
          {
            name: 'Lead Guitar',
            isPercussion: false,
            staves: [
              {
                isStringed: true,
                isPercussion: false,
                tuningName: 'Standard',
                stringTuning: { tunings: [64, 59, 55, 50, 45, 40] },
                bars: [
                  {
                    voices: [
                      {
                        beats: [
                          {
                            absolutePlaybackStart: 0,
                            playbackDuration: 960,
                            isRest: false,
                            notes: [{ string: 1, fret: 1, tone: 5, octave: 2 }],
                          },
                          {
                            absolutePlaybackStart: 1920,
                            playbackDuration: 960,
                            isRest: false,
                            notes: [{ string: 2, fret: 3, tone: 0, octave: 3 }],
                          },
                        ],
                      },
                      {
                        beats: [
                          {
                            absolutePlaybackStart: 1920,
                            playbackDuration: 960,
                            isRest: false,
                            notes: [{ string: 3, fret: 2, tone: 9, octave: 3 }],
                          },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
      instruments.guitar,
      'test.gp5'
    );

    expect(imported.suggestedName).toContain('Test Piece');
    expect(imported.metadata.sourceFormat).toBe('gp5');
    expect(imported.events).toHaveLength(2);

    expect(imported.events[0]?.durationBeats).toBe(2);
    expect(imported.events[0]?.notes).toEqual([{ note: 'F', stringName: 'E', fret: 1 }]);

    expect(imported.events[1]?.durationBeats).toBe(1);
    expect(imported.events[1]?.notes).toEqual(
      expect.arrayContaining([
        { note: 'C', stringName: 'A', fret: 3 },
        { note: 'E', stringName: 'D', fret: 2 },
      ])
    );
  });

  it('inspects multiple tracks and picks matching string-count track by default', () => {
    const score = {
      title: 'Multi Track',
      tempo: 120,
      tracks: [
        {
          name: 'Bass',
          staves: [
            {
              isStringed: true,
              isPercussion: false,
              stringTuning: { tunings: [43, 38, 33, 28] },
              bars: [{ voices: [{ beats: [{ absolutePlaybackStart: 0, playbackDuration: 960, notes: [{ string: 1, fret: 0, tone: 7 }] }] }] }],
            },
          ],
        },
        {
          name: 'Guitar Lead',
          staves: [
            {
              isStringed: true,
              isPercussion: false,
              stringTuning: { tunings: [64, 59, 55, 50, 45, 40] },
              bars: [{ voices: [{ beats: [{ absolutePlaybackStart: 0, playbackDuration: 960, notes: [{ string: 1, fret: 3, tone: 7 }] }] }] }],
            },
          ],
        },
      ],
    };

    const inspected = inspectAlphaTabScoreForMelodyImport(score, instruments.guitar, 'multi.gp5');
    expect(inspected.trackOptions).toHaveLength(2);
    expect(inspected.defaultTrackIndex).toBe(1);

    const imported = convertLoadedGpScoreTrackToImportedMelody(inspected, instruments.guitar, 1);
    expect(imported.metadata.trackName).toBe('Guitar Lead');
    expect(imported.events.length).toBeGreaterThan(0);
  });
});

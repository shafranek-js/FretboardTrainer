import { describe, expect, it } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { instruments } from './instruments';
import {
  convertLoadedMusescoreTrackToImportedMelody,
  loadMusescoreFileFromBytes,
} from './musescore-file-import';

const SIMPLE_MSCX = `<?xml version="1.0" encoding="UTF-8"?>
<museScore version="4.00">
  <Score>
    <metaTag name="workTitle">MuseScore Test</metaTag>
    <Part>
      <trackName>Lead Guitar</trackName>
      <Staff id="1">
        <StaffType group="fretted"/>
      </Staff>
    </Part>
    <Staff id="1">
      <Measure number="1">
        <voice>
          <Chord>
            <durationType>quarter</durationType>
            <Note>
              <pitch>67</pitch>
              <String>1</String>
              <Fret>3</Fret>
            </Note>
          </Chord>
          <Rest>
            <durationType>quarter</durationType>
          </Rest>
          <Chord>
            <durationType>half</durationType>
            <Note>
              <pitch>60</pitch>
              <String>2</String>
              <Fret>1</Fret>
            </Note>
          </Chord>
        </voice>
      </Measure>
    </Staff>
  </Score>
</museScore>`;

const ZERO_BASE_TAB_MSCX = `<?xml version="1.0" encoding="UTF-8"?>
<museScore version="4.00">
  <Score>
    <Part>
      <trackName>Tab</trackName>
      <Staff id="1">
        <StaffType group="tablature"/>
      </Staff>
    </Part>
    <Staff id="1">
      <Measure>
        <voice>
          <Chord>
            <durationType>eighth</durationType>
            <Note>
              <pitch>64</pitch>
              <fret>0</fret>
              <string>0</string>
            </Note>
          </Chord>
          <Chord>
            <durationType>eighth</durationType>
            <Note>
              <pitch>63</pitch>
              <fret>4</fret>
              <string>1</string>
            </Note>
          </Chord>
        </voice>
      </Measure>
    </Staff>
  </Score>
</museScore>`;

const TIED_NOTE_MSCX = `<?xml version="1.0" encoding="UTF-8"?>
<museScore version="4.00">
  <Score>
    <Part>
      <trackName>Tie Test</trackName>
      <Staff id="1">
        <StaffType group="tablature"/>
      </Staff>
    </Part>
    <Staff id="1">
      <Measure>
        <voice>
          <Chord>
            <durationType>quarter</durationType>
            <Note>
              <pitch>57</pitch>
              <string>2</string>
              <fret>2</fret>
              <Spanner type="Tie">
                <next><location><fractions>1/4</fractions></location></next>
              </Spanner>
            </Note>
          </Chord>
          <Chord>
            <durationType>eighth</durationType>
            <Note>
              <pitch>57</pitch>
              <string>2</string>
              <fret>2</fret>
              <Spanner type="Tie">
                <prev><location><fractions>-1/4</fractions></location></prev>
              </Spanner>
            </Note>
          </Chord>
          <Chord>
            <durationType>quarter</durationType>
            <Note>
              <pitch>60</pitch>
              <string>1</string>
              <fret>1</fret>
            </Note>
          </Chord>
        </voice>
      </Measure>
    </Staff>
  </Score>
</museScore>`;

const NOTATION_AND_TAB_WITHOUT_STRING_FRET_MSCX = `<?xml version="1.0" encoding="UTF-8"?>
<museScore version="4.00">
  <Score>
    <Part id="1">
      <trackName>Classical Guitar</trackName>
      <Staff id="1">
        <StaffType group="pitched"/>
      </Staff>
    </Part>
    <Part id="2">
      <trackName>Classical Guitar (tablature)</trackName>
      <Staff id="2">
        <StaffType group="tablature"/>
      </Staff>
    </Part>
    <Staff id="1">
      <Measure>
        <voice>
          <Chord><durationType>quarter</durationType><Note><pitch>64</pitch></Note></Chord>
          <Chord><durationType>quarter</durationType><Note><pitch>63</pitch></Note></Chord>
        </voice>
      </Measure>
    </Staff>
    <Staff id="2">
      <Measure>
        <voice>
          <Chord><durationType>quarter</durationType><Note><pitch>64</pitch></Note></Chord>
          <Chord><durationType>quarter</durationType><Note><pitch>63</pitch></Note></Chord>
        </voice>
      </Measure>
    </Staff>
  </Score>
</museScore>`;

describe('musescore-file-import', () => {
  it('loads MSCX tracks and converts selected track to melody events', async () => {
    const loaded = await loadMusescoreFileFromBytes(
      new TextEncoder().encode(SIMPLE_MSCX),
      'demo.mscx',
      instruments.guitar
    );
    expect(loaded.sourceFormat).toBe('mscx');
    expect(loaded.midiName).toBe('MuseScore Test');
    expect(loaded.trackOptions).toHaveLength(1);
    expect(loaded.defaultTrackIndex).toBe(0);

    const imported = convertLoadedMusescoreTrackToImportedMelody(
      loaded,
      instruments.guitar,
      0,
      { quantize: 'off' }
    );
    expect(imported.metadata.sourceFormat).toBe('mscx');
    expect(imported.events.length).toBe(2);
    expect(imported.events[0]?.notes[0]?.stringName).toBe('e');
    expect(imported.events[0]?.notes[0]?.fret).toBe(3);
    expect(imported.events[1]?.notes[0]?.stringName).toBe('B');
    expect(imported.events[1]?.notes[0]?.fret).toBe(1);
  });

  it('loads MSCZ by extracting embedded MSCX file', async () => {
    const msczBytes = zipSync({
      'score.mscx': strToU8(SIMPLE_MSCX),
    });
    const loaded = await loadMusescoreFileFromBytes(msczBytes, 'demo.mscz', instruments.guitar);
    expect(loaded.sourceFormat).toBe('mscz');
    expect(loaded.trackOptions.length).toBeGreaterThan(0);
  });

  it('supports zero-based MuseScore tablature string numbering', async () => {
    const loaded = await loadMusescoreFileFromBytes(
      new TextEncoder().encode(ZERO_BASE_TAB_MSCX),
      'zero-based.mscx',
      instruments.guitar
    );
    const imported = convertLoadedMusescoreTrackToImportedMelody(
      loaded,
      instruments.guitar,
      loaded.defaultTrackIndex ?? 0,
      { quantize: 'off' }
    );

    expect(imported.events).toHaveLength(2);
    expect(imported.events[0]?.notes[0]).toMatchObject({
      note: 'E',
      stringName: 'e',
      fret: 0,
    });
    expect(imported.events[1]?.notes[0]).toMatchObject({
      note: 'D#',
      stringName: 'B',
      fret: 4,
    });
  });

  it('skips tie-continuation notes and keeps sustained duration on initial onset', async () => {
    const loaded = await loadMusescoreFileFromBytes(
      new TextEncoder().encode(TIED_NOTE_MSCX),
      'tie-test.mscx',
      instruments.guitar
    );
    const imported = convertLoadedMusescoreTrackToImportedMelody(
      loaded,
      instruments.guitar,
      loaded.defaultTrackIndex ?? 0,
      { quantize: 'off' }
    );

    expect(imported.events).toHaveLength(2);
    expect(imported.events[0]).toMatchObject({
      durationBeats: 1.5,
      notes: [{ note: 'A', stringName: 'G', fret: 2 }],
    });
    expect(imported.events[1]).toMatchObject({
      notes: [{ note: 'C', stringName: 'B', fret: 1 }],
    });
  });

  it('always selects tablature track by default when score contains one', async () => {
    const loaded = await loadMusescoreFileFromBytes(
      new TextEncoder().encode(NOTATION_AND_TAB_WITHOUT_STRING_FRET_MSCX),
      'notation+tab.mscx',
      instruments.guitar
    );
    const selected = loaded.tracks.find((track) => track.trackIndex === loaded.defaultTrackIndex);
    expect(selected).toBeTruthy();
    expect(selected?.isTablature).toBe(true);
    expect(selected?.name.toLowerCase()).toContain('tablature');
  });
});

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { BUILTIN_ASCII_TAB_MELODIES } from '../src/builtin-melodies';
import type { BuiltinAsciiTabMelodySpec } from '../src/builtin-melodies';
import { parseAsciiTabToMelodyEvents } from '../src/ascii-tab-melody-parser';
import { instruments } from '../src/instruments';
import type { MelodyDefinition } from '../src/melody-library';
import { exportMelodyToMidiBytes } from '../src/midi-file-export';

interface MidiLibraryManifestEntry {
  id: string;
  name: string;
  instrumentName: MelodyDefinition['instrumentName'];
  fileName: string;
  sourceTempoBpm?: number;
  sourceTimeSignature?: string;
  tabText?: string;
}

interface MidiLibraryManifest {
  version: 1;
  generatedAtIso: string;
  melodies: MidiLibraryManifestEntry[];
}

function toFileName(melodyId: string) {
  return `${melodyId.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.mid`;
}

function toNoteName(noteWithOctave: string) {
  return noteWithOctave.replace(/\d+$/, '');
}

function mapBuiltinSpecToMelodyDefinition(spec: BuiltinAsciiTabMelodySpec): MelodyDefinition {
  const instrument = spec.instrumentName === 'ukulele' ? instruments.ukulele : instruments.guitar;
  const events = Array.isArray(spec.events)
    ? spec.events.map((event) => ({
        barIndex: event.barIndex,
        durationBeats: event.durationBeats,
        notes: event.notes.map((note) => {
          const noteWithOctave = instrument.getNoteWithOctave(note.stringName, note.fret);
          if (!noteWithOctave) {
            throw new Error(
              `Could not resolve note for built-in melody "${spec.name}" on ${note.stringName} fret ${note.fret}.`
            );
          }
          return {
            note: toNoteName(noteWithOctave),
            stringName: note.stringName,
            fret: note.fret,
          };
        }),
      }))
    : parseAsciiTabToMelodyEvents(spec.tabText, instrument).map((event) => ({
        barIndex: event.barIndex,
        column: event.column,
        durationColumns: event.durationColumns,
        durationCountSteps: event.durationCountSteps,
        durationBeats: event.durationBeats,
        notes: event.notes.map((note) => ({
          note: note.note,
          stringName: note.stringName,
          fret: note.fret,
        })),
      }));

  return {
    id: spec.id,
    name: spec.name,
    source: 'builtin',
    instrumentName: spec.instrumentName,
    events,
    tabText: spec.tabText,
    sourceFormat: 'ascii',
    sourceTempoBpm: spec.sourceTempoBpm,
    sourceTimeSignature: spec.sourceTimeSignature,
  };
}

function listBuiltinMelodies() {
  return BUILTIN_ASCII_TAB_MELODIES.map((spec) => mapBuiltinSpecToMelodyDefinition(spec));
}

async function main() {
  const outputDir = path.resolve(process.cwd(), 'generated-midi-library');
  await mkdir(outputDir, { recursive: true });

  const builtins = listBuiltinMelodies();
  const manifestEntries: MidiLibraryManifestEntry[] = [];

  for (const melody of builtins) {
    const instrument = melody.instrumentName === 'ukulele' ? instruments.ukulele : instruments.guitar;
    const fileName = toFileName(melody.id);
    const midiBytes = await exportMelodyToMidiBytes(melody, instrument, {
      bpm: melody.sourceTempoBpm,
    });
    await writeFile(path.join(outputDir, fileName), Buffer.from(midiBytes));
    manifestEntries.push({
      id: melody.id,
      name: melody.name,
      instrumentName: melody.instrumentName,
      fileName,
      sourceTempoBpm: melody.sourceTempoBpm,
      sourceTimeSignature: melody.sourceTimeSignature,
      tabText: melody.tabText,
    });
  }

  const expectedIds = new Set(BUILTIN_ASCII_TAB_MELODIES.map((entry) => entry.id));
  const actualIds = new Set(manifestEntries.map((entry) => entry.id));
  const missing = Array.from(expectedIds).filter((id) => !actualIds.has(id));
  if (missing.length > 0) {
    throw new Error(`Missing exported builtins: ${missing.join(', ')}`);
  }

  const manifest: MidiLibraryManifest = {
    version: 1,
    generatedAtIso: new Date().toISOString(),
    melodies: manifestEntries.sort((a, b) => a.id.localeCompare(b.id)),
  };
  await writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  console.log(`Exported ${manifest.melodies.length} MIDI files to ${outputDir}`);
}

main().catch((error) => {
  console.error('Failed to export built-in MIDI library:', error);
  process.exitCode = 1;
});

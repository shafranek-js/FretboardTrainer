import type { IInstrument } from '../instruments/instrument';

export interface BuiltinMelodyEventNoteSpec {
  stringName: string;
  fret: number;
}

export interface BuiltinMelodyEventSpec {
  barIndex?: number;
  durationBeats: number;
  notes: BuiltinMelodyEventNoteSpec[];
}

export interface BuiltinAsciiTabMelodySpec {
  id: string;
  name: string;
  instrumentName: IInstrument['name'];
  tabText: string;
  events?: BuiltinMelodyEventSpec[];
  sourceTempoBpm?: number;
}

export type BuiltinMonophonicStepSpec = readonly [stringName: string, fret: number, durationBeats?: number];

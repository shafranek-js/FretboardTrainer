interface SoundfontPlayOptions {
  gain?: number;
  duration?: number;
}

interface SoundfontPlayer {
  play(note: string, when?: number, options?: SoundfontPlayOptions): void;
}

interface SoundfontNamespace {
  instrument(context: AudioContext, instrumentName: string): Promise<SoundfontPlayer>;
}

declare const Soundfont: SoundfontNamespace;

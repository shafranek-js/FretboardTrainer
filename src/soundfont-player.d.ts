declare module 'soundfont-player' {
  export interface SoundfontPlayOptions {
    gain?: number;
    duration?: number;
  }

  export interface SoundfontPlayer {
    play(note: string, when?: number, options?: SoundfontPlayOptions): void;
  }

  export function instrument(
    context: AudioContext,
    instrumentName: string
  ): Promise<SoundfontPlayer>;
}

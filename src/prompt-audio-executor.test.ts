import { describe, expect, it, vi } from 'vitest';
import { executePromptAudioPlan } from './prompt-audio-executor';

function createDeps() {
  return {
    setTargetFrequency: vi.fn(),
    setPlaySoundDisabled: vi.fn(),
    playSound: vi.fn(),
  };
}

describe('executePromptAudioPlan', () => {
  it('applies target frequency and disables play button when sound is unavailable', () => {
    const deps = createDeps();

    executePromptAudioPlan(
      {
        notesToPlay: [],
        targetFrequency: null,
        playSoundEnabled: false,
        autoPlaySound: false,
      },
      deps
    );

    expect(deps.setTargetFrequency).toHaveBeenCalledWith(null);
    expect(deps.setPlaySoundDisabled).toHaveBeenCalledWith(true);
    expect(deps.playSound).not.toHaveBeenCalled();
  });

  it('plays a single note when exactly one note is present', () => {
    const deps = createDeps();

    executePromptAudioPlan(
      {
        notesToPlay: ['A4'],
        targetFrequency: 440,
        playSoundEnabled: true,
        autoPlaySound: true,
      },
      deps
    );

    expect(deps.setTargetFrequency).toHaveBeenCalledWith(440);
    expect(deps.setPlaySoundDisabled).toHaveBeenCalledWith(false);
    expect(deps.playSound).toHaveBeenCalledWith('A4');
  });

  it('plays a chord array when multiple notes are present', () => {
    const deps = createDeps();

    executePromptAudioPlan(
      {
        notesToPlay: ['C4', 'E4', 'G4'],
        targetFrequency: 261.63,
        playSoundEnabled: true,
        autoPlaySound: true,
      },
      deps
    );

    expect(deps.playSound).toHaveBeenCalledWith(['C4', 'E4', 'G4']);
  });

  it('keeps manual play enabled but skips auto-play when autoPlaySound is false', () => {
    const deps = createDeps();

    executePromptAudioPlan(
      {
        notesToPlay: ['E4'],
        targetFrequency: 329.63,
        playSoundEnabled: true,
        autoPlaySound: false,
      },
      deps
    );

    expect(deps.setTargetFrequency).toHaveBeenCalledWith(329.63);
    expect(deps.setPlaySoundDisabled).toHaveBeenCalledWith(false);
    expect(deps.playSound).not.toHaveBeenCalled();
  });
});

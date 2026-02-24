import type { PromptAudioPlan } from './prompt-audio-plan';

export interface PromptAudioExecutorDeps {
  setTargetFrequency: (frequency: number | null) => void;
  setPlaySoundDisabled: (disabled: boolean) => void;
  playSound: (notesToPlay: string | string[]) => void;
}

export function executePromptAudioPlan(audioPlan: PromptAudioPlan, deps: PromptAudioExecutorDeps) {
  deps.setTargetFrequency(audioPlan.targetFrequency);
  deps.setPlaySoundDisabled(!audioPlan.playSoundEnabled);
  if (!audioPlan.autoPlaySound) return;

  if (audioPlan.notesToPlay.length === 1) {
    deps.playSound(audioPlan.notesToPlay[0]);
  } else if (audioPlan.notesToPlay.length > 1) {
    deps.playSound(audioPlan.notesToPlay);
  }
}

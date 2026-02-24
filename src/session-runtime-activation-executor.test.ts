import { describe, expect, it, vi } from 'vitest';
import { executeSessionRuntimeActivation } from './session-runtime-activation-executor';
import type { SessionStats } from './types';

function createDeps() {
  let sessionStats: SessionStats | null = null;
  let isListening = false;
  return {
    deps: {
      setIsListening: vi.fn((value: boolean) => {
        isListening = value;
      }),
      setActiveSessionStats: vi.fn((value: SessionStats | null) => {
        sessionStats = value;
      }),
      resetPromptCycleTracking: vi.fn(),
      setStatusText: vi.fn(),
      nextPrompt: vi.fn(),
      processAudio: vi.fn(),
    },
    getSessionStats: () => sessionStats,
    getIsListening: () => isListening,
  };
}

describe('executeSessionRuntimeActivation', () => {
  it('activates a microphone session, creates stats, and starts audio loop', () => {
    const ctx = createDeps();
    executeSessionRuntimeActivation(
      {
        forCalibration: false,
        selectedInputSource: 'microphone',
        sessionInputSource: 'microphone',
        modeKey: 'random',
        modeLabel: 'Random Note',
        instrumentName: 'Guitar',
        tuningPresetKey: 'standard',
        stringOrder: ['E', 'A', 'D', 'G', 'B', 'e'],
        enabledStrings: ['E', 'A'],
        minFret: 0,
        maxFret: 5,
        audioInputDeviceLabel: 'USB Mic',
      },
      ctx.deps
    );

    expect(ctx.getIsListening()).toBe(true);
    expect(ctx.deps.resetPromptCycleTracking).toHaveBeenCalledTimes(1);
    expect(ctx.deps.setStatusText).toHaveBeenCalledWith('Listening...');
    expect(ctx.deps.nextPrompt).toHaveBeenCalledTimes(1);
    expect(ctx.deps.processAudio).toHaveBeenCalledTimes(1);

    const stats = ctx.getSessionStats();
    expect(stats).not.toBeNull();
    expect(stats?.modeKey).toBe('random');
    expect(stats?.modeLabel).toBe('Random Note');
    expect(stats?.inputSource).toBe('microphone');
    expect(stats?.inputDeviceLabel).toBe('USB Mic');
    expect(stats?.enabledStrings).toEqual(['E', 'A']);
    expect(stats?.minFret).toBe(0);
    expect(stats?.maxFret).toBe(5);
  });

  it('activates a midi session without starting processAudio loop', () => {
    const ctx = createDeps();
    executeSessionRuntimeActivation(
      {
        forCalibration: false,
        selectedInputSource: 'midi',
        sessionInputSource: 'midi',
        modeKey: 'chords',
        modeLabel: 'Chord Trainer',
        midiInputDeviceLabel: 'Launchkey',
      },
      ctx.deps
    );

    expect(ctx.deps.setStatusText).toHaveBeenCalledWith('Listening (MIDI)...');
    expect(ctx.deps.nextPrompt).toHaveBeenCalledTimes(1);
    expect(ctx.deps.processAudio).not.toHaveBeenCalled();
    expect(ctx.getSessionStats()?.inputDeviceLabel).toBe('Launchkey');
  });

  it('handles calibration activation without stats or prompt generation', () => {
    const ctx = createDeps();
    executeSessionRuntimeActivation(
      {
        forCalibration: true,
        selectedInputSource: 'microphone',
        sessionInputSource: 'microphone',
      },
      ctx.deps
    );

    expect(ctx.getIsListening()).toBe(true);
    expect(ctx.getSessionStats()).toBeNull();
    expect(ctx.deps.setStatusText).not.toHaveBeenCalled();
    expect(ctx.deps.nextPrompt).not.toHaveBeenCalled();
    expect(ctx.deps.processAudio).toHaveBeenCalledTimes(1);
  });

  it('uses default device labels when none are provided', () => {
    const micCtx = createDeps();
    executeSessionRuntimeActivation(
      {
        forCalibration: false,
        selectedInputSource: 'microphone',
        sessionInputSource: 'microphone',
        modeKey: 'random',
      },
      micCtx.deps
    );
    expect(micCtx.getSessionStats()?.inputDeviceLabel).toBe('Default microphone');

    const midiCtx = createDeps();
    executeSessionRuntimeActivation(
      {
        forCalibration: false,
        selectedInputSource: 'midi',
        sessionInputSource: 'midi',
        modeKey: 'random',
      },
      midiCtx.deps
    );
    expect(midiCtx.getSessionStats()?.inputDeviceLabel).toBe('Default MIDI device');
  });
});

import { describe, expect, it } from 'vitest';
import { shouldBlockStableMonophonicAcceptance } from './mic-stable-monophonic-acceptance';

describe('shouldBlockStableMonophonicAcceptance', () => {
  it('does not block non-performance melody workflows on mic gating failures', () => {
    expect(
      shouldBlockStableMonophonicAcceptance({
        performanceAdaptiveMicInput: false,
        inputSource: 'microphone',
        voicingAccepted: false,
        confidenceAccepted: false,
        attackAccepted: false,
        holdAccepted: false,
      })
    ).toBe(false);
  });

  it('blocks performance-style microphone judging when any gate fails', () => {
    expect(
      shouldBlockStableMonophonicAcceptance({
        performanceAdaptiveMicInput: true,
        inputSource: 'microphone',
        voicingAccepted: true,
        confidenceAccepted: false,
        attackAccepted: true,
        holdAccepted: true,
      })
    ).toBe(true);
  });

  it('never blocks midi input', () => {
    expect(
      shouldBlockStableMonophonicAcceptance({
        performanceAdaptiveMicInput: true,
        inputSource: 'midi',
        voicingAccepted: false,
        confidenceAccepted: false,
        attackAccepted: false,
        holdAccepted: false,
      })
    ).toBe(false);
  });
});

export interface StableMonophonicAcceptanceGateInput {
  performanceAdaptiveMicInput: boolean;
  inputSource: 'microphone' | 'midi';
  voicingAccepted: boolean;
  confidenceAccepted: boolean;
  attackAccepted: boolean;
  holdAccepted: boolean;
}

export function shouldBlockStableMonophonicAcceptance({
  performanceAdaptiveMicInput,
  inputSource,
  voicingAccepted,
  confidenceAccepted,
  attackAccepted,
  holdAccepted,
}: StableMonophonicAcceptanceGateInput) {
  if (!performanceAdaptiveMicInput) return false;
  if (inputSource === 'midi') return false;
  return !voicingAccepted || !confidenceAccepted || !attackAccepted || !holdAccepted;
}

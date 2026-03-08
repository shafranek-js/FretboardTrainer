export function getTrainingModeLabel(mode: string) {
  if (mode === 'random') return 'Find the Note';
  if (mode === 'adaptive') return 'Practice Weak Spots';
  if (mode === 'free') return 'Live Note Finder';
  if (mode === 'melody') return 'Study Melody';
  if (mode === 'practice') return 'Practice';
  if (mode === 'performance') return 'Play Through';
  if (mode === 'rhythm') return 'Play on the Click';
  if (mode === 'scales') return 'Scale Practice';
  if (mode === 'intervals') return 'Interval Training';
  if (mode === 'chords') return 'Chord Training';
  if (mode === 'arpeggios') return 'Arpeggio Practice';
  if (mode === 'progressions') return 'Chord Progressions';
  if (mode === 'timed') return 'Speed Round';
  return mode;
}

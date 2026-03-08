export type ContextHelpTopic =
  | 'start-session'
  | 'input-source'
  | 'melody-library'
  | 'perform-workflow';

export interface ContextHelpContent {
  title: string;
  body: string[];
}

const HELP_CONTENT: Record<ContextHelpTopic, ContextHelpContent> = {
  'start-session': {
    title: 'Main Action',
    body: [
      'The main button is used for active practice workflows: Start Session for Learn Notes, Start Study for Study Melody, Start Practice for Practice, and Start Run for Perform.',
      'Library and Editor do not use the main action button. Use the workflow buttons and the melody actions inside those panels instead.',
      'If nothing seems to happen, first confirm that the selected workflow matches your goal and that your input source is ready.',
    ],
  },
  'input-source': {
    title: 'Input Source',
    body: [
      'Choose Microphone for acoustic instruments, amps, or direct interfaces that the browser hears as audio.',
      'Choose MIDI only when you have a MIDI-capable instrument or controller connected through Web MIDI.',
      'If MIDI is unavailable or no device is connected, switch back to Microphone so you can start practicing immediately.',
    ],
  },
  'melody-library': {
    title: 'Melody Library',
    body: [
      'Pick a built-in melody to start quickly, preview it, or manage stored custom melodies from the library workflow.',
      'Use the Editor workflow when you want to create a melody, import TAB, MIDI, MuseScore, or Guitar Pro, or change source notes.',
      'If a melody looks wrong after import, stay in the preview and switch track or quantize options before saving.',
    ],
  },
  'perform-workflow': {
    title: 'Perform Workflow',
    body: [
      'Perform is for the final full-run check. Use Start Run when you want to play the whole melody without stopping on each note.',
      'Use headphones or direct input for the fastest detection, especially at higher tempos.',
      'If the run feels too strict, build consistency in Practice first, then return to Perform with Balanced or Beginner timing presets.',
    ],
  },
};

export function getContextHelpContent(topic: ContextHelpTopic): ContextHelpContent {
  return HELP_CONTENT[topic];
}

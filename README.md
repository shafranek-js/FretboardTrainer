# FretboardTrainer

Browser-based ear/fretboard trainer for guitar and ukulele with real-time microphone analysis.

## Features

- Monophonic and chord-based training modes
- Real-time tuner feedback
- SVG fretboard rendering (no Canvas fallback)
- Offline-capable build via PWA
- Profile and stats persistence in `localStorage`

## Tech Stack

- Vite + TypeScript
- Tailwind CSS
- Web Audio API
- Vitest
- ESLint + Prettier

## Prerequisites

- Node.js 18+
- npm

## Local Development

1. Install dependencies:
   `npm install`
2. Start dev server:
   `npm run dev`
3. Open the local URL printed by Vite (usually `http://localhost:5173`).

## Scripts

- `npm run dev` - run development server
- `npm run build` - production build
- `npm run test` - run unit tests
- `npm run lint` - run ESLint
- `npm run format` - format code with Prettier
- `npm run format:check` - verify formatting

## Project Notes

- Fretboard rendering pipeline:
  - `src/fretboard-render-plan.ts`
  - `src/svg-fretboard.ts`
  - shared geometry/helpers in `src/fretboard-*.ts`
- Reactive UI updates are centralized in `src/ui-signals.ts`.
- Session/control logic is in `src/logic.ts` and `src/controllers/*`.

## Quality Gate

Before merging changes, run:

1. `npm run format:check`
2. `npm run lint`
3. `npm run test`
4. `npm run build`

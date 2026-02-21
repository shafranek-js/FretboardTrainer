import { dom, state } from './state';
import {
  getEnabledStrings,
  getSelectedFretRange,
  isChordTrainingModeActive,
} from './fretboard-ui-state';
import { computeFretboardLayout } from './fretboard-layout';
import { positionStringLabels } from './fretboard-string-labels';
import type { ChordNote } from './types';

const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => {
    el.setAttribute(key, String(value));
  });
  return el;
}

function appendCircle(
  svg: SVGSVGElement,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke = 'none',
  strokeWidth = 0
) {
  svg.appendChild(
    createSvgEl('circle', {
      cx: x,
      cy: y,
      r,
      fill,
      stroke,
      'stroke-width': strokeWidth,
    })
  );
}

function appendText(
  svg: SVGSVGElement,
  x: number,
  y: number,
  text: string,
  fontSize: number,
  fill = '#fff',
  weight = 'normal'
) {
  const textEl = createSvgEl('text', {
    x,
    y,
    fill,
    'font-size': fontSize,
    'font-family': 'Segoe UI',
    'font-weight': weight,
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
  });
  textEl.textContent = text;
  svg.appendChild(textEl);
}

/** Draws the fretboard using SVG primitives (feature-flagged from ui.ts). */
export function drawFretboardSvg(
  showAll = false,
  rootNote: string | null = null,
  rootString: string | null = null,
  chordFingering: ChordNote[] = [],
  foundChordNotes: Set<string> = new Set(),
  currentTargetNote: string | null = null
) {
  const svg = dom.fretboardSvg;
  const instrumentData = state.currentInstrument;
  const FRETBOARD = instrumentData.FRETBOARD;
  const STRING_ORDER = instrumentData.STRING_ORDER;
  const MARKER_POSITIONS = instrumentData.MARKER_POSITIONS;
  const enabledStrings = getEnabledStrings(dom.stringSelector);

  const width = dom.fretboard.clientWidth;
  const height = dom.fretboard.clientHeight;
  if (width <= 0 || height <= 0) return;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));
  svg.innerHTML = '';

  const stringCount = STRING_ORDER.length;
  const layout = computeFretboardLayout(width, height, stringCount);
  if (!layout) return;

  const {
    fretCount,
    fretboardHeight,
    startY,
    stringSpacing,
    fretSpacing,
    noteRadius,
    noteFontSize,
    labelFontSize,
    nutX,
    openNoteX,
    fretNumberAreaHeight,
  } = layout;

  // Fret markers
  MARKER_POSITIONS.forEach((fret) => {
    const x = nutX + (fret - 0.5) * fretSpacing;
    const markerRadius = noteRadius * 0.7;
    if (fret === 12) {
      const y1 = startY + (stringCount / 2 - 1.5) * stringSpacing;
      const y2 = startY + (stringCount / 2 + 0.5) * stringSpacing;
      appendCircle(svg, x, y1, markerRadius, 'rgba(224, 224, 224, 0.5)');
      appendCircle(svg, x, y2, markerRadius, 'rgba(224, 224, 224, 0.5)');
    } else {
      const y = startY + ((stringCount - 1) / 2) * stringSpacing;
      appendCircle(svg, x, y, markerRadius, 'rgba(224, 224, 224, 0.5)');
    }
  });

  // Nut and frets
  svg.appendChild(
    createSvgEl('line', {
      x1: nutX,
      y1: startY,
      x2: nutX,
      y2: startY + fretboardHeight,
      stroke: '#495057',
      'stroke-width': 6,
    })
  );
  for (let i = 1; i <= fretCount; i++) {
    const x = nutX + i * fretSpacing;
    svg.appendChild(
      createSvgEl('line', {
        x1: x,
        y1: startY,
        x2: x,
        y2: startY + fretboardHeight,
        stroke: '#495057',
        'stroke-width': 2,
      })
    );
  }

  // Strings
  STRING_ORDER.forEach((stringName, idx) => {
    const y = startY + idx * stringSpacing;
    svg.appendChild(
      createSvgEl('line', {
        x1: nutX,
        y1: y,
        x2: nutX + fretCount * fretSpacing,
        y2: y,
        stroke: enabledStrings.has(stringName) ? '#adb5bd' : '#5a626a',
        'stroke-width': 1 + idx * ((6 / stringCount) * 0.2),
      })
    );
  });

  // Show all notes mode
  if (showAll) {
    const { minFret, maxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);
    svg.setAttribute(
      'aria-label',
      `${state.currentInstrument.name} fretboard showing all notes from fret ${minFret} to ${maxFret}.`
    );

    STRING_ORDER.forEach((stringName, stringIdx) => {
      if (!enabledStrings.has(stringName)) return;
      const y = startY + stringIdx * stringSpacing;
      const stringNotes = FRETBOARD[stringName as keyof typeof FRETBOARD] as Record<string, number>;
      Object.entries(stringNotes).forEach(([note, fret]) => {
        if (fret >= minFret && fret <= maxFret) {
          const x = fret === 0 ? openNoteX : nutX + (fret - 0.5) * fretSpacing;
          appendCircle(svg, x, y, noteRadius, '#495057');
          appendText(svg, x, y, note, noteFontSize * 0.9, '#adb5bd');
        }
      });

      // Preserve legacy behavior: duplicate open note at fret 12 when range includes 12.
      if (maxFret === 12) {
        const openStringNote = Object.keys(stringNotes)[0];
        const fret12X = nutX + (12 - 0.5) * fretSpacing;
        appendCircle(svg, fret12X, y, noteRadius, '#495057');
        appendText(svg, fret12X, y, openStringNote, noteFontSize * 0.9, '#adb5bd');
      }
    });
  }

  // Fret numbers
  for (let i = 1; i <= fretCount; i++) {
    const x = nutX + (i - 0.5) * fretSpacing;
    const y = startY + fretboardHeight + fretNumberAreaHeight * 0.2;
    const textEl = createSvgEl('text', {
      x,
      y,
      fill: '#adb5bd',
      'font-size': labelFontSize,
      'font-family': 'Segoe UI',
      'text-anchor': 'middle',
      'dominant-baseline': 'hanging',
    });
    textEl.textContent = String(i);
    svg.appendChild(textEl);
  }

  // Root note highlight
  if (rootNote && rootString) {
    const stringIdx = STRING_ORDER.indexOf(rootString);
    const stringNotes = FRETBOARD[rootString as keyof typeof FRETBOARD] as Record<string, number>;
    const rootFret = stringNotes[rootNote];
    if (stringIdx >= 0 && typeof rootFret === 'number') {
      const y = startY + stringIdx * stringSpacing;
      const x = rootFret === 0 ? openNoteX : nutX + (rootFret - 0.5) * fretSpacing;
      appendCircle(svg, x, y, noteRadius * 1.2, '#28a745', '#1e7e34', 2);
      appendText(svg, x, y, rootNote, noteFontSize, '#fff', 'bold');
      svg.setAttribute(
        'aria-label',
        `Fretboard showing note ${rootNote} on the ${rootString} string.`
      );
    }
  } else if (
    chordFingering.length > 0 &&
    isChordTrainingModeActive(dom.trainingMode.value, state.isListening)
  ) {
    svg.setAttribute('aria-label', 'Fretboard showing the notes for a chord.');
    chordFingering.forEach((noteInfo) => {
      const { note, string, fret } = noteInfo;
      if (!enabledStrings.has(string)) return;
      const stringIdx = STRING_ORDER.indexOf(string);
      if (stringIdx < 0) return;

      const y = startY + stringIdx * stringSpacing;
      const x = fret === 0 ? openNoteX : nutX + (fret - 0.5) * fretSpacing;
      const isFound = foundChordNotes.has(note);
      const isCurrent = note === currentTargetNote;

      const fill = isCurrent ? '#ffc107' : isFound ? '#28a745' : '#17a2b8';
      const stroke = isCurrent ? '#d39e00' : isFound ? '#1e7e34' : '#138496';
      appendCircle(svg, x, y, noteRadius * 1.1, fill, stroke, 2);
      appendText(svg, x, y, note, noteFontSize, '#fff', 'bold');
    });
  } else {
    svg.setAttribute('aria-label', `${state.currentInstrument.name} fretboard visualization.`);
  }

  const stringLabels = Array.from(dom.stringSelector.children) as HTMLElement[];
  positionStringLabels(stringLabels, stringCount, startY, stringSpacing, nutX, fretSpacing);
}

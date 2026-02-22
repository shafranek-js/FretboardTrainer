import { dom, state } from './state';
import {
  getEnabledStrings,
  getSelectedFretRange,
  isChordTrainingModeActive,
} from './fretboard-ui-state';
import { computeFretboardLayout } from './fretboard-layout';
import { positionStringLabels } from './fretboard-string-labels';
import type { ChordNote } from './types';
import { formatMusicText } from './note-display';

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
  textEl.textContent = formatMusicText(text);
  svg.appendChild(textEl);
}

function appendRect(svg: SVGSVGElement, attrs: Record<string, string | number>) {
  svg.appendChild(createSvgEl('rect', attrs));
}

function appendLine(svg: SVGSVGElement, attrs: Record<string, string | number>) {
  svg.appendChild(createSvgEl('line', attrs));
}

function appendFretboardDefs(svg: SVGSVGElement) {
  const defs = createSvgEl('defs', {});

  const woodGradient = createSvgEl('linearGradient', {
    id: 'fretboardWoodGradient',
    x1: '0%',
    y1: '0%',
    x2: '100%',
    y2: '0%',
  });
  [
    { offset: '0%', color: '#3a2416' },
    { offset: '18%', color: '#613a20' },
    { offset: '40%', color: '#4b2c18' },
    { offset: '62%', color: '#7a4a27' },
    { offset: '82%', color: '#4e2f1c' },
    { offset: '100%', color: '#2e1b11' },
  ].forEach(({ offset, color }) => {
    woodGradient.appendChild(
      createSvgEl('stop', { offset, 'stop-color': color, 'stop-opacity': 1 })
    );
  });
  defs.appendChild(woodGradient);

  const edgeShade = createSvgEl('linearGradient', {
    id: 'fretboardEdgeShade',
    x1: '0%',
    y1: '0%',
    x2: '0%',
    y2: '100%',
  });
  [
    { offset: '0%', color: '#000', opacity: 0.42 },
    { offset: '12%', color: '#000', opacity: 0.12 },
    { offset: '50%', color: '#fff', opacity: 0.04 },
    { offset: '88%', color: '#000', opacity: 0.12 },
    { offset: '100%', color: '#000', opacity: 0.38 },
  ].forEach(({ offset, color, opacity }) => {
    edgeShade.appendChild(
      createSvgEl('stop', { offset, 'stop-color': color, 'stop-opacity': opacity })
    );
  });
  defs.appendChild(edgeShade);

  const grainPattern = createSvgEl('pattern', {
    id: 'fretboardGrainPattern',
    width: 180,
    height: 22,
    patternUnits: 'userSpaceOnUse',
  });
  grainPattern.appendChild(
    createSvgEl('rect', { x: 0, y: 0, width: 180, height: 22, fill: 'transparent' })
  );
  [2, 6, 9, 14, 18].forEach((y, idx) => {
    grainPattern.appendChild(
      createSvgEl('path', {
        d: `M -10 ${y} C 18 ${y - 1}, 35 ${y + 2}, 58 ${y + 1} S 102 ${y - 2}, 136 ${y} S 168 ${y + 2}, 194 ${y + 1}`,
        fill: 'none',
        stroke: idx % 2 === 0 ? 'rgba(255,235,205,0.09)' : 'rgba(40,20,10,0.14)',
        'stroke-width': idx % 2 === 0 ? 0.8 : 1.1,
        'stroke-linecap': 'round',
      })
    );
  });
  defs.appendChild(grainPattern);

  const metalGradient = createSvgEl('linearGradient', {
    id: 'fretMetalGradient',
    x1: '0%',
    y1: '0%',
    x2: '100%',
    y2: '0%',
  });
  [
    { offset: '0%', color: '#8d949d' },
    { offset: '28%', color: '#f4f7fa' },
    { offset: '52%', color: '#c0c7d0' },
    { offset: '76%', color: '#fafcff' },
    { offset: '100%', color: '#7a818a' },
  ].forEach(({ offset, color }) => {
    metalGradient.appendChild(createSvgEl('stop', { offset, 'stop-color': color }));
  });
  defs.appendChild(metalGradient);

  svg.appendChild(defs);
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
  const fretboardX = Math.max(0, nutX - fretSpacing * 0.18);
  const fretboardWidth = Math.min(width - fretboardX, fretCount * fretSpacing + fretSpacing * 0.36);
  const fretboardY = startY - Math.max(8, stringSpacing * 0.38);
  const visualBoardHeight = fretboardHeight + Math.max(16, stringSpacing * 0.76);
  const boardRadius = Math.max(10, stringSpacing * 0.6);
  const boardEndX = fretboardX + fretboardWidth;
  const fretTopY = fretboardY + Math.max(4, stringSpacing * 0.18);
  const fretBottomY = fretboardY + visualBoardHeight - Math.max(4, stringSpacing * 0.18);

  appendFretboardDefs(svg);

  // Wooden fretboard body and subtle inset/shadow layers.
  appendRect(svg, {
    x: fretboardX + 2,
    y: fretboardY + 4,
    width: fretboardWidth,
    height: visualBoardHeight,
    rx: boardRadius,
    ry: boardRadius,
    fill: 'rgba(0, 0, 0, 0.28)',
  });
  appendRect(svg, {
    x: fretboardX,
    y: fretboardY,
    width: fretboardWidth,
    height: visualBoardHeight,
    rx: boardRadius,
    ry: boardRadius,
    fill: 'url(#fretboardWoodGradient)',
    stroke: '#20120a',
    'stroke-width': 2,
  });
  appendRect(svg, {
    x: fretboardX + 1,
    y: fretboardY + 1,
    width: Math.max(0, fretboardWidth - 2),
    height: Math.max(0, visualBoardHeight - 2),
    rx: Math.max(2, boardRadius - 1),
    ry: Math.max(2, boardRadius - 1),
    fill: 'url(#fretboardGrainPattern)',
    opacity: 0.95,
  });
  appendRect(svg, {
    x: fretboardX,
    y: fretboardY,
    width: fretboardWidth,
    height: visualBoardHeight,
    rx: boardRadius,
    ry: boardRadius,
    fill: 'url(#fretboardEdgeShade)',
    opacity: 0.9,
  });
  appendLine(svg, {
    x1: fretboardX + 10,
    y1: fretboardY + visualBoardHeight * 0.22,
    x2: boardEndX - 12,
    y2: fretboardY + visualBoardHeight * 0.18,
    stroke: 'rgba(255, 228, 196, 0.12)',
    'stroke-width': 1.2,
    'stroke-linecap': 'round',
  });
  appendLine(svg, {
    x1: fretboardX + 16,
    y1: fretboardY + visualBoardHeight * 0.78,
    x2: boardEndX - 8,
    y2: fretboardY + visualBoardHeight * 0.82,
    stroke: 'rgba(255, 228, 196, 0.08)',
    'stroke-width': 1,
    'stroke-linecap': 'round',
  });

  // Fret markers
  MARKER_POSITIONS.forEach((fret) => {
    const x = nutX + (fret - 0.5) * fretSpacing;
    const markerRadius = noteRadius * 0.7;
    if (fret === 12) {
      const y1 = startY + (stringCount / 2 - 1.5) * stringSpacing;
      const y2 = startY + (stringCount / 2 + 0.5) * stringSpacing;
      appendCircle(svg, x, y1, markerRadius, 'rgba(237, 243, 247, 0.72)', 'rgba(60, 67, 76, 0.5)', 1);
      appendCircle(svg, x, y2, markerRadius, 'rgba(237, 243, 247, 0.72)', 'rgba(60, 67, 76, 0.5)', 1);
    } else {
      const y = startY + ((stringCount - 1) / 2) * stringSpacing;
      appendCircle(svg, x, y, markerRadius, 'rgba(237, 243, 247, 0.72)', 'rgba(60, 67, 76, 0.5)', 1);
    }
  });

  // Nut and frets
  appendLine(svg, {
    x1: nutX,
    y1: fretTopY,
    x2: nutX,
    y2: fretBottomY,
    stroke: '#f2e3c9',
    'stroke-width': 7,
  });
  appendLine(svg, {
    x1: nutX - 1,
    y1: fretTopY,
    x2: nutX - 1,
    y2: fretBottomY,
    stroke: 'rgba(91, 68, 45, 0.65)',
    'stroke-width': 1.4,
  });
  const fretCrownWidth = Math.max(2.05, Math.min(2.85, fretSpacing * 0.105));
  const fretSlotShadowWidth = Math.max(0.95, fretCrownWidth * 0.42);
  const fretHighlightWidth = Math.max(0.42, fretCrownWidth * 0.2);
  const fretRightFalloffWidth = Math.max(0.36, fretCrownWidth * 0.18);
  const fretLeftEdgeShadowWidth = Math.max(0.55, fretCrownWidth * 0.28);
  for (let i = 1; i <= fretCount; i++) {
    const x = nutX + i * fretSpacing;
    // Fret slot shadow (cut into the wood)
    appendLine(svg, {
      x1: x + 0.15,
      y1: fretTopY,
      x2: x + 0.15,
      y2: fretBottomY,
      stroke: 'rgba(26, 14, 8, 0.34)',
      'stroke-width': fretSlotShadowWidth,
      'stroke-linecap': 'round',
    });
    // Left edge shadow of the fret crown
    appendLine(svg, {
      x1: x - fretCrownWidth * 0.28,
      y1: fretTopY,
      x2: x - fretCrownWidth * 0.28,
      y2: fretBottomY,
      stroke: 'rgba(66, 72, 80, 0.25)',
      'stroke-width': fretLeftEdgeShadowWidth,
      'stroke-linecap': 'round',
    });
    // Satin nickel fret crown
    appendLine(svg, {
      x1: x,
      y1: fretTopY,
      x2: x,
      y2: fretBottomY,
      stroke: '#c7ced6',
      'stroke-width': fretCrownWidth,
      'stroke-linecap': 'round',
    });
    // Narrow specular highlight
    appendLine(svg, {
      x1: x - fretCrownWidth * 0.17,
      y1: fretTopY,
      x2: x - fretCrownWidth * 0.17,
      y2: fretBottomY,
      stroke: 'rgba(255, 255, 255, 0.6)',
      'stroke-width': fretHighlightWidth,
      'stroke-linecap': 'round',
    });
    // Right-side falloff so the fret looks rounded, not flat
    appendLine(svg, {
      x1: x + fretCrownWidth * 0.19,
      y1: fretTopY,
      x2: x + fretCrownWidth * 0.19,
      y2: fretBottomY,
      stroke: 'rgba(104, 111, 121, 0.4)',
      'stroke-width': fretRightFalloffWidth,
      'stroke-linecap': 'round',
    });
  }

  // Strings
  const enabledStringPalette = ['#eef2f7', '#dde3ea', '#cfd6df', '#bec6cf', '#aeb7c2', '#9fa9b5'];
  const woundStringPalette = ['#caa074', '#b98757', '#aa7647', '#9a693d', '#8c5d34', '#7f522d'];
  const disabledStringColor = 'rgba(115, 123, 132, 0.75)';
  const woundStringStartIndex = stringCount >= 6 ? 2 : Number.POSITIVE_INFINITY;
  STRING_ORDER.forEach((stringName, idx) => {
    const y = startY + idx * stringSpacing;
    const isEnabled = enabledStrings.has(stringName);
    const strokeWidth = 1.15 + idx * ((6 / stringCount) * 0.34);
    const isWoundString = idx >= woundStringStartIndex;
    const strokeColor = isEnabled
      ? isWoundString
        ? woundStringPalette[Math.min(idx, woundStringPalette.length - 1)]
        : enabledStringPalette[Math.min(idx, enabledStringPalette.length - 1)]
      : disabledStringColor;
    appendLine(svg, {
      x1: nutX,
      y1: y,
      x2: nutX + fretCount * fretSpacing,
      y2: y,
      stroke: strokeColor,
      'stroke-width': strokeWidth,
      'stroke-linecap': 'round',
      opacity: isEnabled ? 0.95 : 0.7,
    });
    if (isEnabled) {
      if (isWoundString) {
        // Simulate wound strings with alternating dash overlays (string winding ridges).
        const dashSize = Math.max(1.1, Math.min(2.4, fretSpacing * 0.075));
        const gapSize = Math.max(0.8, Math.min(1.8, dashSize * 0.7));
        appendLine(svg, {
          x1: nutX,
          y1: y,
          x2: nutX + fretCount * fretSpacing,
          y2: y,
          stroke: 'rgba(255, 214, 163, 0.38)',
          'stroke-width': Math.max(0.4, strokeWidth * 0.27),
          'stroke-linecap': 'butt',
          'stroke-dasharray': `${dashSize} ${gapSize}`,
          'stroke-dashoffset': 0.15,
          opacity: 0.95,
        });
        appendLine(svg, {
          x1: nutX,
          y1: y + 0.12,
          x2: nutX + fretCount * fretSpacing,
          y2: y + 0.12,
          stroke: 'rgba(66, 35, 16, 0.34)',
          'stroke-width': Math.max(0.25, strokeWidth * 0.17),
          'stroke-linecap': 'butt',
          'stroke-dasharray': `${dashSize} ${gapSize}`,
          'stroke-dashoffset': dashSize * 0.55,
          opacity: 0.9,
        });
        appendLine(svg, {
          x1: nutX,
          y1: y - 0.12,
          x2: nutX + fretCount * fretSpacing,
          y2: y - 0.12,
          stroke: 'rgba(255, 238, 214, 0.18)',
          'stroke-width': Math.max(0.2, strokeWidth * 0.1),
          'stroke-linecap': 'butt',
          'stroke-dasharray': `${dashSize * 0.7} ${gapSize * 1.1}`,
          'stroke-dashoffset': dashSize * 0.3,
          opacity: 0.85,
        });
      }
      appendLine(svg, {
        x1: nutX,
        y1: y - 0.45,
        x2: nutX + fretCount * fretSpacing,
        y2: y - 0.45,
        stroke: isWoundString ? 'rgba(255, 236, 210, 0.16)' : 'rgba(255, 255, 255, 0.24)',
        'stroke-width': Math.max(0.45, strokeWidth * (isWoundString ? 0.16 : 0.22)),
        'stroke-linecap': 'round',
        opacity: 0.9,
      });
    }
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
          appendCircle(svg, x, y, noteRadius, 'rgba(28, 22, 19, 0.88)', 'rgba(176, 144, 109, 0.35)', 1.2);
          appendText(svg, x, y, note, noteFontSize * 0.9, '#e6d5ba');
        }
      });

      // Preserve legacy behavior: duplicate open note at fret 12 when range includes 12.
      if (maxFret === 12) {
        const openStringNote = Object.keys(stringNotes)[0];
        const fret12X = nutX + (12 - 0.5) * fretSpacing;
        appendCircle(
          svg,
          fret12X,
          y,
          noteRadius,
          'rgba(28, 22, 19, 0.88)',
          'rgba(176, 144, 109, 0.35)',
          1.2
        );
        appendText(svg, fret12X, y, openStringNote, noteFontSize * 0.9, '#e6d5ba');
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
      fill: '#d7c29d',
      'font-size': labelFontSize,
      'font-family': 'Segoe UI',
      'text-anchor': 'middle',
      'dominant-baseline': 'hanging',
    });
    textEl.textContent = String(i);
    svg.appendChild(textEl);
  }

  // Root note highlight (single-string or all positions when string is omitted)
  if (rootNote) {
    if (rootString) {
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
    } else {
      const { minFret, maxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);
      let highlightedCount = 0;

      STRING_ORDER.forEach((stringName, stringIdx) => {
        if (!enabledStrings.has(stringName)) return;
        const stringNotes = FRETBOARD[stringName as keyof typeof FRETBOARD] as Record<string, number>;
        const fret = stringNotes[rootNote];
        const y = startY + stringIdx * stringSpacing;

        if (typeof fret === 'number' && fret >= minFret && fret <= maxFret) {
          const x = fret === 0 ? openNoteX : nutX + (fret - 0.5) * fretSpacing;
          appendCircle(svg, x, y, noteRadius * 1.15, '#28a745', '#1e7e34', 2);
          appendText(svg, x, y, rootNote, noteFontSize, '#fff', 'bold');
          highlightedCount++;
        }

        // Like show-all mode, duplicate the open-string pitch class at fret 12 when visible.
        if (maxFret === 12 && minFret <= 12) {
          const openStringNote = Object.keys(stringNotes)[0];
          if (openStringNote === rootNote) {
            const fret12X = nutX + (12 - 0.5) * fretSpacing;
            appendCircle(svg, fret12X, y, noteRadius * 1.15, '#28a745', '#1e7e34', 2);
            appendText(svg, fret12X, y, rootNote, noteFontSize, '#fff', 'bold');
            highlightedCount++;
          }
        }
      });

      svg.setAttribute(
        'aria-label',
        highlightedCount > 0
          ? `Fretboard showing all visible positions for note ${rootNote}.`
          : `Fretboard showing no visible positions for note ${rootNote} in the selected range.`
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

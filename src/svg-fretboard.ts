import { dom } from './dom';
import { state } from './state';
import { isMelodyWorkflowMode } from './training-mode-groups';
import {
  getEnabledStrings,
  getSelectedFretRange,
  isChordTrainingModeActive,
} from './fretboard-ui-state';
import { computeFretboardLayout } from './fretboard-layout';
import { positionStringLabels } from './fretboard-string-labels';
import { formatMusicText } from './note-display';
import type { ChordNote } from './types';
import { playSound } from './audio';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MIN_RENDER_FRET_COUNT = 1;
const MAX_RENDER_FRET_COUNT = 24;
const FINGER_COLORS: Record<number, string> = {
  0: '#9ca3af',
  1: '#f59e0b',
  2: '#a855f7',
  3: '#0ea5e9',
  4: '#ef4444',
};

type SvgContainer = SVGSVGElement | SVGGElement;
let lastStaticFretboardRenderKey = '';
let cachedDynamicNotesLayer: SVGGElement | null = null;
type DynamicNoteMarker = {
  group: SVGGElement;
  halo: SVGCircleElement;
  circle: SVGCircleElement;
  text: SVGTextElement;
};
let cachedDynamicNoteMarkers: DynamicNoteMarker[] = [];

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
  svg: SvgContainer,
  x: number,
  y: number,
  r: number,
  fill: string,
  stroke = 'none',
  strokeWidth = 0
) {
  const circle = createSvgEl('circle', {
    cx: x,
    cy: y,
    r,
    fill,
    stroke,
    'stroke-width': strokeWidth,
  });
  svg.appendChild(circle);
  return circle;
}

function appendRect(svg: SvgContainer, attrs: Record<string, string | number>) {
  svg.appendChild(createSvgEl('rect', attrs));
}

function appendLine(svg: SvgContainer, attrs: Record<string, string | number>) {
  svg.appendChild(createSvgEl('line', attrs));
}

function stripOctaveSuffix(noteWithOctave: string) {
  return noteWithOctave.replace(/-?\d+$/, '');
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getFingerColorForFret(
  fret: number,
  options: { anchorFret?: number | null; useAbsoluteCycle?: boolean } = {}
) {
  const { anchorFret = null, useAbsoluteCycle = false } = options;
  if (fret <= 0) return FINGER_COLORS[0];
  if (useAbsoluteCycle || anchorFret === null || !Number.isFinite(anchorFret)) {
    const finger = ((fret - 1) % 4) + 1;
    return FINGER_COLORS[finger] ?? FINGER_COLORS[4];
  }
  const finger = Math.max(1, Math.min(4, fret - anchorFret + 1));
  return FINGER_COLORS[finger] ?? FINGER_COLORS[4];
}

function getFingerColorForAssignedFinger(finger: number | null | undefined) {
  if (!Number.isFinite(finger)) return null;
  const normalized = clamp(Math.round(Number(finger)), 0, 4);
  return FINGER_COLORS[normalized] ?? null;
}

function resolveAnchorFretFromFrets(frets: number[]) {
  const positiveFrets = frets.filter((fret) => Number.isFinite(fret) && fret > 0).sort((a, b) => a - b);
  if (positiveFrets.length === 0) return null;
  const minFret = positiveFrets[0];
  const maxFret = positiveFrets[positiveFrets.length - 1];
  const spread = maxFret - minFret;
  if (spread > 5) return null;
  return minFret;
}

function createDynamicNoteMarker(parent: SvgContainer) {
  const group = createSvgEl('g', {});
  group.style.cursor = 'pointer';

  const halo = createSvgEl('circle', {
    cx: 0,
    cy: 0,
    r: 1,
    fill: 'rgba(255, 255, 255, 0.08)',
    stroke: 'rgba(251, 191, 36, 0.9)',
    'stroke-width': 1.25,
    opacity: 0,
    'pointer-events': 'none',
  });

  const circle = createSvgEl('circle', {
    cx: 0,
    cy: 0,
    r: 1,
    fill: '#9ca3af',
    stroke: 'none',
    'stroke-width': 0,
  });

  const textEl = createSvgEl('text', {
    x: 0,
    y: 0,
    fill: '#fff',
    'font-size': 12,
    'font-family': 'Segoe UI',
    'font-weight': 'normal',
    'text-anchor': 'middle',
    'dominant-baseline': 'middle',
    'pointer-events': 'none',
  });
  textEl.textContent = '';

  const applyHover = (isHovering: boolean) => {
    const baseRadius = Number(group.dataset.baseRadius ?? '0');
    const baseStroke = group.dataset.baseStroke ?? 'none';
    const baseStrokeWidth = Number(group.dataset.baseStrokeWidth ?? '0');
    const baseTextWeight = group.dataset.baseTextWeight ?? 'normal';
    halo.setAttribute('opacity', isHovering ? '1' : '0');
    circle.setAttribute('r', String(isHovering ? baseRadius * 1.07 : baseRadius));
    circle.setAttribute('stroke', isHovering ? '#f59e0b' : baseStroke);
    circle.setAttribute(
      'stroke-width',
      String(isHovering ? Math.max(2, baseStrokeWidth || 0) : baseStrokeWidth)
    );
    textEl.setAttribute('font-weight', isHovering ? 'bold' : baseTextWeight);
  };

  group.addEventListener('pointerenter', () => applyHover(true));
  group.addEventListener('pointerleave', () => applyHover(false));
  group.addEventListener('pointercancel', () => applyHover(false));

  group.appendChild(halo);
  group.appendChild(circle);
  group.appendChild(textEl);
  parent.appendChild(group);
  return { group, halo, circle, text: textEl };
}

function getDynamicNoteMarker(parent: SvgContainer, index: number) {
  let marker = cachedDynamicNoteMarkers[index];
  if (!marker) {
    marker = createDynamicNoteMarker(parent);
    cachedDynamicNoteMarkers[index] = marker;
  } else if (marker.group.parentNode !== parent) {
    parent.appendChild(marker.group);
  }
  return marker;
}

function renderDynamicNoteMarker(
  parent: SvgContainer,
  index: number,
  x: number,
  y: number,
  note: string,
  radius: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  fontSize: number,
  textFill = '#fff',
  textWeight = 'normal'
) {
  const marker = getDynamicNoteMarker(parent, index);
  marker.group.style.display = '';
  marker.group.dataset.baseRadius = String(radius);
  marker.group.dataset.baseStroke = stroke;
  marker.group.dataset.baseStrokeWidth = String(strokeWidth);
  marker.group.dataset.baseTextWeight = textWeight;

  marker.halo.setAttribute('cx', String(x));
  marker.halo.setAttribute('cy', String(y));
  marker.halo.setAttribute('r', String(radius * 1.42));
  marker.halo.setAttribute('stroke-width', String(Math.max(1.25, strokeWidth || 0)));
  marker.halo.setAttribute('opacity', '0');

  marker.circle.setAttribute('cx', String(x));
  marker.circle.setAttribute('cy', String(y));
  marker.circle.setAttribute('r', String(radius));
  marker.circle.setAttribute('fill', fill);
  marker.circle.setAttribute('stroke', stroke);
  marker.circle.setAttribute('stroke-width', String(strokeWidth));

  marker.text.setAttribute('x', String(x));
  marker.text.setAttribute('y', String(y));
  marker.text.setAttribute('fill', textFill);
  marker.text.setAttribute('font-size', String(fontSize));
  marker.text.setAttribute('font-weight', textWeight);
  marker.text.textContent = formatMusicText(note);
}

function hideUnusedDynamicNoteMarkers(fromIndex: number) {
  for (let index = fromIndex; index < cachedDynamicNoteMarkers.length; index += 1) {
    cachedDynamicNoteMarkers[index].group.style.display = 'none';
  }
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

let cachedFretboardWidth = 0;
let cachedFretboardHeight = 0;
let fretboardResizeObserver: ResizeObserver | null = null;

function ensureFretboardResizeObserver() {
  if (typeof ResizeObserver === 'undefined') {
    cachedFretboardWidth = dom.fretboard.clientWidth;
    cachedFretboardHeight = dom.fretboard.clientHeight;
    return;
  }
  if (fretboardResizeObserver) return;
  cachedFretboardWidth = dom.fretboard.clientWidth;
  cachedFretboardHeight = dom.fretboard.clientHeight;
  fretboardResizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target === dom.fretboard) {
        cachedFretboardWidth = entry.contentRect.width;
        cachedFretboardHeight = entry.contentRect.height;
      }
    }
  });
  fretboardResizeObserver.observe(dom.fretboard);
}

/** Draws the fretboard using SVG primitives (feature-flagged from ui.ts). */
export function drawFretboardSvg(
  showAll = false,
  rootNote: string | null = null,
  rootString: string | null = null,
  chordFingering: ChordNote[] = [],
  foundChordNotes: Set<string> = new Set(),
  currentTargetNote: string | null = null,
  wrongDetectedNote: string | null = null,
  wrongDetectedString: string | null = null,
  wrongDetectedFret: number | null = null
) {
  ensureFretboardResizeObserver();
  const svg = dom.fretboardSvg;
  const instrumentData = state.currentInstrument;
  const FRETBOARD = instrumentData.FRETBOARD;
  const STRING_ORDER = instrumentData.STRING_ORDER;
  const MARKER_POSITIONS = instrumentData.MARKER_POSITIONS;
  const enabledStrings = getEnabledStrings(dom.stringSelector);
  const visibleStrings = isMelodyWorkflowMode(dom.trainingMode.value)
    ? new Set(STRING_ORDER)
    : enabledStrings;
  const { maxFret: selectedMaxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);
  const renderFretCount = Math.max(MIN_RENDER_FRET_COUNT, Math.min(MAX_RENDER_FRET_COUNT, selectedMaxFret));

  const width = cachedFretboardWidth;
  const height = cachedFretboardHeight;
  if (width <= 0 || height <= 0) return;

  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', String(width));
  svg.setAttribute('height', String(height));

  const stringCount = STRING_ORDER.length;
  const layout = computeFretboardLayout(width, height, stringCount, { fretCount: renderFretCount });
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
    fretWireXs,
    fretCenterXs,
  } = layout;
  const getFretWireX = (fret: number) => fretWireXs[fret] ?? (nutX + fret * fretSpacing);
  const getFretCenterX = (fret: number) => fretCenterXs[fret] ?? (fret === 0 ? openNoteX : nutX + (fret - 0.5) * fretSpacing);
  const getPitchClassAtPosition = (stringName: string, fret: number) => {
    const noteWithOctave = instrumentData.getNoteWithOctave(stringName, fret);
    return noteWithOctave ? stripOctaveSuffix(noteWithOctave) : null;
  };
  const lastFretX = getFretWireX(fretCount);
  const fretboardX = Math.max(0, nutX - fretSpacing * 0.18);
  const fretboardWidth = Math.min(width - fretboardX, Math.max(0, lastFretX - nutX) + fretSpacing * 0.36);
  const fretboardY = startY - Math.max(8, stringSpacing * 0.38);
  const visualBoardHeight = fretboardHeight + Math.max(16, stringSpacing * 0.76);
  const boardRadius = 0;
  const boardEndX = fretboardX + fretboardWidth;
  const fretTopY = fretboardY + Math.max(4, stringSpacing * 0.18);
  const fretBottomY = fretboardY + visualBoardHeight - Math.max(4, stringSpacing * 0.18);
  const enabledStringsKey = [...visibleStrings].sort().join(',');
  const staticRenderKey = [
    state.currentInstrument.name,
    renderFretCount,
    width,
    height,
    enabledStringsKey,
  ].join('|');
  const shouldRebuildStaticLayer =
    lastStaticFretboardRenderKey !== staticRenderKey ||
    cachedDynamicNotesLayer === null ||
    cachedDynamicNotesLayer.ownerSVGElement !== svg;

  let dynamicNotesLayer = cachedDynamicNotesLayer;

  if (shouldRebuildStaticLayer) {
    svg.innerHTML = '';
    lastStaticFretboardRenderKey = staticRenderKey;
    cachedDynamicNoteMarkers = [];

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

    // Fret markers (repeat marker pattern every octave for extended fretboards).
    const markerFrets = new Set<number>();
    MARKER_POSITIONS.forEach((baseFret) => {
      for (let fret = baseFret; fret <= fretCount; fret += 12) {
        if (fret > 0) markerFrets.add(fret);
      }
    });

    [...markerFrets]
      .sort((a, b) => a - b)
      .forEach((fret) => {
        const x = getFretCenterX(fret);
        const markerRadius = noteRadius * 0.7;
        if (fret % 12 === 0) {
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
      const x = getFretWireX(i);
      appendLine(svg, {
        x1: x + 0.15,
        y1: fretTopY,
        x2: x + 0.15,
        y2: fretBottomY,
        stroke: 'rgba(26, 14, 8, 0.34)',
        'stroke-width': fretSlotShadowWidth,
        'stroke-linecap': 'round',
      });
      appendLine(svg, {
        x1: x - fretCrownWidth * 0.28,
        y1: fretTopY,
        x2: x - fretCrownWidth * 0.28,
        y2: fretBottomY,
        stroke: 'rgba(66, 72, 80, 0.25)',
        'stroke-width': fretLeftEdgeShadowWidth,
        'stroke-linecap': 'round',
      });
      appendLine(svg, {
        x1: x,
        y1: fretTopY,
        x2: x,
        y2: fretBottomY,
        stroke: '#c7ced6',
        'stroke-width': fretCrownWidth,
        'stroke-linecap': 'round',
      });
      appendLine(svg, {
        x1: x - fretCrownWidth * 0.17,
        y1: fretTopY,
        x2: x - fretCrownWidth * 0.17,
        y2: fretBottomY,
        stroke: 'rgba(255, 255, 255, 0.6)',
        'stroke-width': fretHighlightWidth,
        'stroke-linecap': 'round',
      });
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
      const isEnabled = visibleStrings.has(stringName);
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
        x2: lastFretX,
        y2: y,
        stroke: strokeColor,
        'stroke-width': strokeWidth,
        'stroke-linecap': 'round',
        opacity: isEnabled ? 0.95 : 0.7,
      });
      if (isEnabled) {
        if (isWoundString) {
          const dashSize = Math.max(1.1, Math.min(2.4, fretSpacing * 0.075));
          const gapSize = Math.max(0.8, Math.min(1.8, dashSize * 0.7));
          appendLine(svg, {
            x1: nutX,
            y1: y,
            x2: lastFretX,
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
            x2: lastFretX,
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
            x2: lastFretX,
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
          x2: lastFretX,
          y2: y - 0.45,
          stroke: isWoundString ? 'rgba(255, 236, 210, 0.16)' : 'rgba(255, 255, 255, 0.24)',
          'stroke-width': Math.max(0.45, strokeWidth * (isWoundString ? 0.16 : 0.22)),
          'stroke-linecap': 'round',
          opacity: 0.9,
        });
      }
    });

    // Fret numbers
    for (let i = 1; i <= fretCount; i++) {
      const x = getFretCenterX(i);
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

    dynamicNotesLayer = createSvgEl('g', {
      'data-role': 'dynamic-notes-layer',
    });
    svg.appendChild(dynamicNotesLayer);
    cachedDynamicNotesLayer = dynamicNotesLayer;
  } else {
    dynamicNotesLayer = cachedDynamicNotesLayer;
  }

  if (!dynamicNotesLayer) return;
  let dynamicNoteMarkerIndex = 0;

  // Show all notes mode
  if (showAll) {
    const { minFret, maxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);
    svg.setAttribute(
      'aria-label',
      `${state.currentInstrument.name} fretboard showing all notes from fret ${minFret} to ${maxFret}.`
    );

    STRING_ORDER.forEach((stringName, stringIdx) => {
      if (!visibleStrings.has(stringName)) return;
      const y = startY + stringIdx * stringSpacing;
      const visibleMaxFret = Math.min(maxFret, fretCount);
      for (let fret = Math.max(0, minFret); fret <= visibleMaxFret; fret++) {
        const note = getPitchClassAtPosition(stringName, fret);
        if (!note) continue;
        const x = fret === 0 ? openNoteX : getFretCenterX(fret);
        const fingerFill = getFingerColorForFret(fret, { useAbsoluteCycle: true });
        renderDynamicNoteMarker(
          dynamicNotesLayer,
          dynamicNoteMarkerIndex++,
          x,
          y,
          note,
          noteRadius,
          fingerFill,
          'rgba(22, 28, 36, 0.85)',
          1.4,
          noteFontSize * 0.9,
          '#f8fafc'
        );
      }
    });
  }

  // Root note highlight (single-string or all positions when string is omitted)
  if (rootNote) {
    if (rootString) {
      const stringIdx = STRING_ORDER.indexOf(rootString);
      const stringNotes = FRETBOARD[rootString as keyof typeof FRETBOARD] as Record<string, number>;
      const rootFret = stringNotes[rootNote];
      if (stringIdx >= 0 && typeof rootFret === 'number') {
        const y = startY + stringIdx * stringSpacing;
        const x = rootFret === 0 ? openNoteX : getFretCenterX(rootFret);
        const fingerFill = getFingerColorForFret(rootFret, { useAbsoluteCycle: true });
        renderDynamicNoteMarker(
          dynamicNotesLayer,
          dynamicNoteMarkerIndex++,
          x,
          y,
          rootNote,
          noteRadius * 1.2,
          fingerFill,
          '#1e7e34',
          2,
          noteFontSize,
          '#fff',
          'bold'
        );
        svg.setAttribute(
          'aria-label',
          `Fretboard showing note ${rootNote} on the ${rootString} string.`
        );
      }
    } else {
      const { minFret, maxFret } = getSelectedFretRange(dom.startFret.value, dom.endFret.value);
      let highlightedCount = 0;

      STRING_ORDER.forEach((stringName, stringIdx) => {
        if (!visibleStrings.has(stringName)) return;
        const y = startY + stringIdx * stringSpacing;
        const visibleMaxFret = Math.min(maxFret, fretCount);
        for (let fret = Math.max(0, minFret); fret <= visibleMaxFret; fret++) {
          const noteAtFret = getPitchClassAtPosition(stringName, fret);
          if (noteAtFret !== rootNote) continue;
          const x = fret === 0 ? openNoteX : getFretCenterX(fret);
          const fingerFill = getFingerColorForFret(fret, { useAbsoluteCycle: true });
          renderDynamicNoteMarker(
            dynamicNotesLayer,
            dynamicNoteMarkerIndex++,
            x,
            y,
            rootNote,
            noteRadius * 1.15,
            fingerFill,
            '#1e7e34',
            2,
            noteFontSize,
            '#fff',
            'bold'
          );
          highlightedCount++;
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
    (isChordTrainingModeActive(dom.trainingMode.value, state.isListening) ||
      isMelodyWorkflowMode(dom.trainingMode.value))
  ) {
    svg.setAttribute(
      'aria-label',
      isMelodyWorkflowMode(dom.trainingMode.value)
        ? 'Fretboard showing the notes for the current melody event.'
        : 'Fretboard showing the notes for a chord.'
    );
    const chordFingerAnchor = resolveAnchorFretFromFrets(chordFingering.map((note) => note.fret));
    chordFingering.forEach((noteInfo) => {
      const { note, string, fret } = noteInfo;
      if (!visibleStrings.has(string)) return;
      const stringIdx = STRING_ORDER.indexOf(string);
      if (stringIdx < 0) return;

      const y = startY + stringIdx * stringSpacing;
      const x = fret === 0 ? openNoteX : getFretCenterX(fret);
      const isFound = foundChordNotes.has(note);
      const isCurrent = note === currentTargetNote;

      const fill =
        getFingerColorForAssignedFinger(noteInfo.finger) ??
        getFingerColorForFret(fret, { anchorFret: chordFingerAnchor });
      const stroke = isCurrent ? '#d39e00' : isFound ? '#1e7e34' : '#138496';
      renderDynamicNoteMarker(
        dynamicNotesLayer,
        dynamicNoteMarkerIndex++,
        x,
        y,
        note,
        noteRadius * 1.1,
        fill,
        stroke,
        2,
        noteFontSize,
        '#fff',
        'bold'
      );
    });
  } else {
    svg.setAttribute('aria-label', `${state.currentInstrument.name} fretboard visualization.`);
  }

  if (wrongDetectedNote && wrongDetectedString && visibleStrings.has(wrongDetectedString)) {
    const wrongStringIdx = STRING_ORDER.indexOf(wrongDetectedString);
    if (wrongStringIdx >= 0) {
      const wrongFret =
        typeof wrongDetectedFret === 'number'
          ? wrongDetectedFret
          : FRETBOARD[wrongDetectedString as keyof typeof FRETBOARD]?.[wrongDetectedNote];
      if (typeof wrongFret === 'number' && wrongFret <= fretCount) {
        const y = startY + wrongStringIdx * stringSpacing;
        const x = wrongFret === 0 ? openNoteX : getFretCenterX(wrongFret);
        renderDynamicNoteMarker(
          dynamicNotesLayer,
          dynamicNoteMarkerIndex++,
          x,
          y,
          wrongDetectedNote,
          noteRadius * 1.12,
          '#dc2626',
          '#7f1d1d',
          2.4,
          noteFontSize,
          '#fff',
          'bold'
        );
      }
    }
  }

  hideUnusedDynamicNoteMarkers(dynamicNoteMarkerIndex);

  if (shouldRebuildStaticLayer) {
    // Hover preview for any string+fret position (not only visible note markers).
    const hoverGroup = createSvgEl('g', {
      opacity: 0,
      'pointer-events': 'none',
      'data-role': 'hover-preview',
    });
    const hoverHalo = createSvgEl('circle', {
      cx: 0,
      cy: 0,
      r: noteRadius * 1.45,
      fill: 'rgba(251, 191, 36, 0.16)',
      stroke: 'rgba(251, 191, 36, 0.95)',
      'stroke-width': 2,
    });
    const hoverDot = createSvgEl('circle', {
      cx: 0,
      cy: 0,
      r: noteRadius * 1.08,
      fill: 'rgba(15, 23, 42, 0.92)',
      stroke: '#f59e0b',
      'stroke-width': 2,
    });
    const hoverText = createSvgEl('text', {
      x: 0,
      y: 0,
      fill: '#fde68a',
      'font-size': noteFontSize,
      'font-family': 'Segoe UI',
      'font-weight': 'bold',
      'text-anchor': 'middle',
      'dominant-baseline': 'middle',
      'pointer-events': 'none',
    });
    hoverText.textContent = '';
    hoverGroup.appendChild(hoverHalo);
    hoverGroup.appendChild(hoverDot);
    hoverGroup.appendChild(hoverText);
    svg.appendChild(hoverGroup);

    const openAreaLeftX = Math.max(0, openNoteX - fretSpacing * 0.6);
    const openAreaRightX = nutX;
    const boardHoverBottomY = fretBottomY + Math.max(6, stringSpacing * 0.15);
    const boardHoverTopY = fretTopY - Math.max(6, stringSpacing * 0.15);

    const hideHoverPreview = () => {
      hoverGroup.setAttribute('opacity', '0');
    };

    const showHoverPreview = (x: number, y: number, noteName: string) => {
      hoverHalo.setAttribute('cx', String(x));
      hoverHalo.setAttribute('cy', String(y));
      hoverDot.setAttribute('cx', String(x));
      hoverDot.setAttribute('cy', String(y));
      hoverText.setAttribute('x', String(x));
      hoverText.setAttribute('y', String(y));
      hoverText.textContent = formatMusicText(noteName);
      hoverGroup.setAttribute('opacity', '1');
    };

    const getHoveredStringIndex = (y: number) => {
      const nearest = Math.round((y - startY) / stringSpacing);
      if (nearest < 0 || nearest >= stringCount) return null;
      const centerY = startY + nearest * stringSpacing;
      return Math.abs(y - centerY) <= stringSpacing * 0.62 ? nearest : null;
    };

    const getHoveredFret = (x: number) => {
      if (x >= openAreaLeftX && x < openAreaRightX) return 0;
      if (x < nutX || x > lastFretX) return null;
      for (let fret = 1; fret <= fretCount; fret++) {
        const left = getFretWireX(fret - 1);
        const right = getFretWireX(fret);
        if (x >= left && x <= right) return fret;
      }
      return null;
    };

    const resolvePointerNotePosition = (event: PointerEvent) => {
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return null;
      const local = point.matrixTransform(ctm.inverse());
      if (
        local.x < openAreaLeftX ||
        local.x > boardEndX ||
        local.y < boardHoverTopY ||
        local.y > boardHoverBottomY
      ) {
        return null;
      }

      const stringIdx = getHoveredStringIndex(local.y);
      if (stringIdx === null) return null;
      const fret = getHoveredFret(local.x);
      if (fret === null) return null;

      const stringName = STRING_ORDER[stringIdx];
      const noteWithOctave = instrumentData.getNoteWithOctave(stringName, fret);
      if (!noteWithOctave) return null;

      return {
        x: fret === 0 ? openNoteX : getFretCenterX(fret),
        y: startY + stringIdx * stringSpacing,
        fret,
        stringName,
        noteWithOctave,
        noteName: stripOctaveSuffix(noteWithOctave),
      };
    };

    let activeDragPointerId: number | null = null;
    let lastDragPositionKey: string | null = null;
    let lastDragPlayAtMs = 0;
    const DRAG_PLAY_MIN_INTERVAL_MS = 28;

    const playResolvedPointerNote = (
      resolved: NonNullable<ReturnType<typeof resolvePointerNotePosition>>,
      options: { force?: boolean } = {}
    ) => {
      const key = `${resolved.stringName}:${resolved.fret}`;
      const now = performance.now();
      const force = options.force === true;
      if (!force) {
        if (key === lastDragPositionKey) return;
        if (now - lastDragPlayAtMs < DRAG_PLAY_MIN_INTERVAL_MS) return;
      }
      playSound(resolved.noteWithOctave);
      lastDragPositionKey = key;
      lastDragPlayAtMs = now;
    };

    const endDragPlayback = (event?: PointerEvent) => {
      if (event && activeDragPointerId !== null && event.pointerId !== activeDragPointerId) return;
      if (event && svg.hasPointerCapture?.(event.pointerId)) {
        try {
          svg.releasePointerCapture(event.pointerId);
        } catch {
          // no-op
        }
      }
      activeDragPointerId = null;
      lastDragPositionKey = null;
      lastDragPlayAtMs = 0;
    };

    svg.onpointermove = (event: PointerEvent) => {
      const resolved = resolvePointerNotePosition(event);
      if (!resolved) {
        if (activeDragPointerId !== null && event.pointerId === activeDragPointerId) {
          lastDragPositionKey = null;
        }
        hideHoverPreview();
        return;
      }
      showHoverPreview(resolved.x, resolved.y, resolved.noteName);
      if (activeDragPointerId !== null && event.pointerId === activeDragPointerId) {
        playResolvedPointerNote(resolved);
      }
    };
    svg.onpointerleave = () => {
      if (activeDragPointerId === null) {
        hideHoverPreview();
      }
    };
    svg.onpointercancel = (event: PointerEvent) => {
      hideHoverPreview();
      endDragPlayback(event);
    };
    svg.onpointerdown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      event.preventDefault();
      const resolved = resolvePointerNotePosition(event);
      if (!resolved) return;
      activeDragPointerId = event.pointerId;
      lastDragPositionKey = null;
      lastDragPlayAtMs = 0;
      try {
        svg.setPointerCapture(event.pointerId);
      } catch {
        // no-op
      }
      playResolvedPointerNote(resolved, { force: true });
      showHoverPreview(resolved.x, resolved.y, resolved.noteName);
    };
    svg.onpointerup = (event: PointerEvent) => {
      endDragPlayback(event);
    };
    svg.onlostpointercapture = () => {
      activeDragPointerId = null;
      lastDragPositionKey = null;
      lastDragPlayAtMs = 0;
    };
  }

  const stringLabels = Array.from(dom.stringSelector.children) as HTMLElement[];
  positionStringLabels(stringLabels, stringCount, startY, stringSpacing, nutX, fretSpacing);
}

import { describe, expect, it } from 'vitest';
import {
  formatScrollingTabPanelZoomPercent,
  getScrollingTabPanelZoomScale,
  normalizeScrollingTabPanelZoomPercent,
} from './scrolling-tab-panel-zoom';

describe('scrolling tab panel zoom helpers', () => {
  it('clamps invalid values to the default zoom', () => {
    expect(normalizeScrollingTabPanelZoomPercent(undefined)).toBe(100);
    expect(normalizeScrollingTabPanelZoomPercent('')).toBe(100);
  });

  it('clamps values to the supported range', () => {
    expect(normalizeScrollingTabPanelZoomPercent(20)).toBe(70);
    expect(normalizeScrollingTabPanelZoomPercent(240)).toBe(170);
  });

  it('formats and scales normalized values', () => {
    expect(formatScrollingTabPanelZoomPercent(115)).toBe('115%');
    expect(getScrollingTabPanelZoomScale('125')).toBe(1.25);
  });
});

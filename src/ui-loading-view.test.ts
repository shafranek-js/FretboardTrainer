import { beforeEach, describe, expect, it, vi } from 'vitest';

function createClassListState() {
  const classes = new Set<string>();
  return {
    add: vi.fn((value: string) => {
      classes.add(value);
    }),
    remove: vi.fn((value: string) => {
      classes.delete(value);
    }),
    toggle: vi.fn((value: string, force?: boolean) => {
      if (force === undefined) {
        if (classes.has(value)) {
          classes.delete(value);
          return false;
        }
        classes.add(value);
        return true;
      }
      if (force) {
        classes.add(value);
        return true;
      }
      classes.delete(value);
      return false;
    }),
    contains: (value: string) => classes.has(value),
  };
}

function createElementStub() {
  const attributes = new Map<string, string>();
  return {
    classList: createClassListState(),
    style: {},
    textContent: '',
    disabled: false,
    setAttribute: vi.fn((name: string, value: string) => {
      attributes.set(name, value);
    }),
    getAttribute: (name: string) => attributes.get(name) ?? null,
  };
}

const harness = vi.hoisted(() => ({
  dom: {
    startBtn: createElementStub(),
    instrumentSelector: createElementStub(),
    settingsBtn: createElementStub(),
    loadingMessage: createElementStub(),
    loadingOverlay: createElementStub(),
  },
  bodyStyle: { cursor: '' },
}));

vi.mock('./dom', () => ({
  dom: harness.dom,
}));

vi.stubGlobal('document', {
  body: {
    style: harness.bodyStyle,
  },
});

import { renderLoadingView } from './ui-loading-view';

describe('ui-loading-view', () => {
  beforeEach(() => {
    harness.bodyStyle.cursor = '';
  });

  it('shows loading overlay and disables controls while loading', () => {
    renderLoadingView(
      { isLoading: true, message: 'Loading soundfont...' },
      { startDisabled: false }
    );

    expect(harness.dom.startBtn.disabled).toBe(true);
    expect(harness.dom.instrumentSelector.disabled).toBe(true);
    expect(harness.dom.settingsBtn.disabled).toBe(true);
    expect(harness.dom.loadingMessage.textContent).toBe('Loading soundfont...');
    expect(harness.dom.loadingOverlay.classList.contains('hidden')).toBe(false);
    expect(harness.dom.loadingOverlay.classList.contains('flex')).toBe(true);
    expect(harness.dom.loadingOverlay.getAttribute('aria-hidden')).toBe('false');
    expect(harness.bodyStyle.cursor).toBe('wait');
  });

  it('hides loading overlay and preserves disabled start state when idle', () => {
    renderLoadingView(
      { isLoading: false, message: '' },
      { startDisabled: true }
    );

    expect(harness.dom.startBtn.disabled).toBe(true);
    expect(harness.dom.instrumentSelector.disabled).toBe(false);
    expect(harness.dom.settingsBtn.disabled).toBe(false);
    expect(harness.dom.loadingOverlay.classList.contains('hidden')).toBe(true);
    expect(harness.dom.loadingOverlay.classList.contains('flex')).toBe(false);
    expect(harness.dom.loadingOverlay.getAttribute('aria-hidden')).toBe('true');
    expect(harness.bodyStyle.cursor).toBe('default');
  });
});

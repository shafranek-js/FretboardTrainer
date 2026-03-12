import { describe, expect, it, vi } from 'vitest';

const { bindUiRenderSignals, bindUiWorkflowSignals } = vi.hoisted(() => ({
  bindUiRenderSignals: vi.fn(),
  bindUiWorkflowSignals: vi.fn(),
}));

vi.mock('./dom', () => ({
  dom: {
    showStringToggles: { checked: true },
    melodySetupToggleBtn: {
      classList: {
        contains: vi.fn(() => false),
      },
    },
  },
}));

vi.mock('./ui-render-bindings', () => ({
  bindUiRenderSignals,
}));

vi.mock('./ui-workflow-bindings', () => ({
  bindUiWorkflowSignals,
}));

describe('ui-signal-bindings', () => {
  it('binds render and workflow subscriptions only once', async () => {
    bindUiRenderSignals.mockClear();
    bindUiWorkflowSignals.mockClear();

    const { bindUiSignalBindings } = await import('./ui-signal-bindings');
    const { uiSignalBindingRuntimeState } = await import('./ui-signal-store');

    bindUiSignalBindings();
    bindUiSignalBindings();

    expect(bindUiRenderSignals).toHaveBeenCalledTimes(1);
    expect(bindUiWorkflowSignals).toHaveBeenCalledTimes(1);
    expect(bindUiWorkflowSignals.mock.calls[0][0].runtimeState).toBe(uiSignalBindingRuntimeState);
  });
});

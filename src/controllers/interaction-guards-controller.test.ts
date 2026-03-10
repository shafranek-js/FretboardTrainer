import { describe, expect, it } from 'vitest';
import { createInteractionGuardsController } from './interaction-guards-controller';

function createDeps() {
  return {
    blockingModals: [
      { classList: { contains: (token: string) => token === 'hidden' } },
      { classList: { contains: () => false } },
    ],
  };
}

describe('interaction-guards-controller', () => {
  it('recognizes text-entry targets and contenteditable targets', () => {
    const controller = createInteractionGuardsController(createDeps());

    expect(controller.isTextEntryElement({ tagName: 'input' } as EventTarget)).toBe(true);
    expect(controller.isTextEntryElement({ tagName: 'TEXTAREA' } as EventTarget)).toBe(true);
    expect(controller.isTextEntryElement({ isContentEditable: true } as EventTarget)).toBe(true);
    expect(controller.isTextEntryElement({ tagName: 'button' } as EventTarget)).toBe(false);
    expect(controller.isTextEntryElement(null)).toBe(false);
  });

  it('checks whether an event target is within a container', () => {
    const controller = createInteractionGuardsController(createDeps());
    const target = { id: 'target' } as EventTarget;
    const container = {
      contains: (value: unknown) => value === target,
    };

    expect(controller.isElementWithin(target, container)).toBe(true);
    expect(controller.isElementWithin({ id: 'other' } as EventTarget, container)).toBe(false);
    expect(controller.isElementWithin(target, null)).toBe(false);
  });

  it('reports when any blocking modal is open', () => {
    const controller = createInteractionGuardsController(createDeps());

    expect(controller.isAnyBlockingModalOpen()).toBe(true);
  });
});

interface BlockingModalLike {
  classList: {
    contains(token: string): boolean;
  };
}

interface ContainerLike {
  contains(target: unknown): boolean;
}

interface ElementLike {
  isContentEditable?: boolean;
  tagName?: string;
}

export interface InteractionGuardsControllerDeps {
  blockingModals: BlockingModalLike[];
}

function isElementLike(target: unknown): target is ElementLike {
  return typeof target === 'object' && target !== null;
}

export function createInteractionGuardsController(deps: InteractionGuardsControllerDeps) {
  function isTextEntryElement(target: EventTarget | null) {
    if (!isElementLike(target)) return false;
    if (target.isContentEditable === true) return true;
    const tagName = typeof target.tagName === 'string' ? target.tagName.toUpperCase() : '';
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
  }

  function isElementWithin(target: EventTarget | null, container: ContainerLike | null | undefined) {
    return typeof container?.contains === 'function' && typeof target === 'object' && target !== null
      ? container.contains(target)
      : false;
  }

  function isAnyBlockingModalOpen() {
    return deps.blockingModals.some((element) => !element.classList.contains('hidden'));
  }

  return {
    isTextEntryElement,
    isElementWithin,
    isAnyBlockingModalOpen,
  };
}

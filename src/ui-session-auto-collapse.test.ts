import { describe, expect, it } from 'vitest';
import { resolveSessionAutoCollapseTransition } from './ui-session-auto-collapse';

describe('ui-session-auto-collapse', () => {
  it('collapses open panels when a session starts', () => {
    const result = resolveSessionAutoCollapseTransition({
      sessionActive: true,
      previousSessionActive: false,
      wasAutoCollapsedForSession: false,
      wasAutoCollapsedMelodySetupForSession: false,
      wasAutoCollapsedSessionToolsForSession: false,
      practiceSetupCollapsed: false,
      melodySetupCollapsed: false,
      sessionToolsCollapsed: false,
      melodySetupToggleHidden: false,
    });

    expect(result.nextPracticeSetupCollapsed).toBe(true);
    expect(result.nextMelodySetupCollapsed).toBe(true);
    expect(result.nextSessionToolsCollapsed).toBe(true);
    expect(result.wasAutoCollapsedForSession).toBe(true);
    expect(result.wasAutoCollapsedMelodySetupForSession).toBe(true);
    expect(result.wasAutoCollapsedSessionToolsForSession).toBe(true);
  });

  it('restores only panels that were auto-collapsed when a session stops', () => {
    const result = resolveSessionAutoCollapseTransition({
      sessionActive: false,
      previousSessionActive: true,
      wasAutoCollapsedForSession: true,
      wasAutoCollapsedMelodySetupForSession: false,
      wasAutoCollapsedSessionToolsForSession: true,
      practiceSetupCollapsed: true,
      melodySetupCollapsed: true,
      sessionToolsCollapsed: true,
      melodySetupToggleHidden: false,
    });

    expect(result.nextPracticeSetupCollapsed).toBe(false);
    expect(result.nextMelodySetupCollapsed).toBe(null);
    expect(result.nextSessionToolsCollapsed).toBe(false);
    expect(result.wasAutoCollapsedForSession).toBe(false);
    expect(result.previousSessionActive).toBe(false);
  });

  it('keeps state unchanged when session activity does not transition', () => {
    const result = resolveSessionAutoCollapseTransition({
      sessionActive: true,
      previousSessionActive: true,
      wasAutoCollapsedForSession: false,
      wasAutoCollapsedMelodySetupForSession: true,
      wasAutoCollapsedSessionToolsForSession: false,
      practiceSetupCollapsed: true,
      melodySetupCollapsed: true,
      sessionToolsCollapsed: true,
      melodySetupToggleHidden: true,
    });

    expect(result.nextPracticeSetupCollapsed).toBe(null);
    expect(result.nextMelodySetupCollapsed).toBe(null);
    expect(result.nextSessionToolsCollapsed).toBe(null);
    expect(result.wasAutoCollapsedMelodySetupForSession).toBe(true);
    expect(result.previousSessionActive).toBe(true);
  });
});

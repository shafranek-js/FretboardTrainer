import { describe, expect, it } from 'vitest';
import { getContextHelpContent } from './context-help-content';

describe('context-help-content', () => {
  it('returns structured help for start session', () => {
    const content = getContextHelpContent('start-session');

    expect(content.title).toBe('Main Action');
    expect(content.body.length).toBeGreaterThanOrEqual(2);
    expect(content.body.join(' ')).toContain('Start Study');
    expect(content.body.join(' ')).toContain('Start Practice');
    expect(content.body.join(' ')).toContain('Library and Editor do not use the main action button');
  });

  it('returns perform workflow guidance', () => {
    const content = getContextHelpContent('perform-workflow');

    expect(content.body.join(' ')).toContain('Start Run');
    expect(content.body.join(' ')).toContain('headphones');
    expect(content.body.join(' ')).toContain('timing presets');
  });
});

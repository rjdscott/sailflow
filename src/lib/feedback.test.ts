import { describe, expect, it } from 'vitest';
import { feedbackUrl } from './feedback';

function bodyOf(url: string): string {
  return new URL(url).searchParams.get('body') ?? '';
}

describe('feedbackUrl', () => {
  it('points at the sailflow new-issue form with a titled prefill', () => {
    const url = new URL(feedbackUrl({ route: 'race', version: '0.1.0' }));
    expect(url.origin + url.pathname).toBe('https://github.com/rjdscott/sailflow/issues/new');
    expect(url.searchParams.get('title')).toBe('This felt wrong: race');
  });

  it('carries the version and the route in the body', () => {
    const body = bodyOf(feedbackUrl({ route: 'drills', version: '1.2.3' }));
    expect(body).toContain('- Screen: drills');
    expect(body).toContain('- Version: 1.2.3');
  });

  it('leaves a placeholder when the caller has no scenario URL yet', () => {
    const body = bodyOf(feedbackUrl({ route: 'dock', version: '0.1.0' }));
    expect(body).toContain('- Scenario: <!--');
  });

  it('uses the scenario URL when one is supplied', () => {
    const scenarioUrl = 'https://rjdscott.github.io/sailflow/#/race?c=abc';
    const body = bodyOf(feedbackUrl({ route: 'race', version: '0.1.0', scenarioUrl }));
    expect(body).toContain(`- Scenario: ${scenarioUrl}`);
  });

  it('says in the body that nothing was attached automatically', () => {
    expect(bodyOf(feedbackUrl({ route: 'race', version: '0.1.0' }))).toContain('no usage counters');
  });

  it('percent-encodes the body rather than emitting raw newlines', () => {
    const raw = feedbackUrl({ route: 'race', version: '0.1.0' });
    expect(raw).not.toContain('\n');
    expect(raw).toContain('body=');
  });
});

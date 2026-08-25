/**
 * "This felt wrong" (audit ux-02 M-29): a prefilled GitHub new-issue URL.
 *
 * No backend and no upload — the user sees the whole payload in GitHub's
 * compose box before submitting, which is what keeps the "nothing leaves this
 * device" promise on More honest. So: no usage counters, no log entries, no
 * identifiers. The scenario link is a placeholder the user pastes into,
 * unless the caller already has an addressable URL to hand.
 */

const NEW_ISSUE = 'https://github.com/rjdscott/sailflow/issues/new';

export interface FeedbackContext {
  /** Screen the user was on: `race`, `drills`, … */
  route: string;
  /** `import.meta.env.VITE_APP_VERSION`, so the report names a build. */
  version: string;
  /** An addressable scenario URL if the screen has one (phase 04); else a placeholder. */
  scenarioUrl?: string;
}

export function feedbackUrl(ctx: FeedbackContext): string {
  const body = [
    '## What felt wrong',
    '',
    "<!-- What did Sailflow say, and what would you have done on the boat instead? If you've sailed the number, say so — that's the evidence the model doesn't have. -->",
    '',
    '## Context',
    '',
    `- Screen: ${ctx.route}`,
    `- Version: ${ctx.version}`,
    `- Scenario: ${ctx.scenarioUrl ?? '<!-- paste the link from your address bar so the condition and trim come with it -->'}`,
    '',
    'Nothing was attached automatically: no usage counters, no log entries, no personal data.',
  ].join('\n');

  const params = new URLSearchParams({
    title: `This felt wrong: ${ctx.route}`,
    body,
  });
  return `${NEW_ISSUE}?${params}`;
}

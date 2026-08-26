/**
 * Which guide columns the disagreement panel and the Dock recommendation show.
 *
 * Pure: `guidesFor()` does the file enumeration (`src/lib/reference.ts`), this
 * turns a list of entries into columns for one wind speed. Three states are
 * all real and all distinct — a guide with numbers, a guide whose table was
 * removed (`rec === null`, "not loaded"), and no guide at all for this boat
 * (`[]`), which is what a second class looks like before anyone transcribes
 * a guide for it.
 */
import {
  guideRecommendation,
  type GuideEntry,
  type GuideRecommendation,
} from '../../lib/reference';

export interface GuideColumn extends GuideEntry {
  /** `null` when the guide's table is not loaded. */
  rec: GuideRecommendation | null;
}

/**
 * Below this every guide is shown at once; above it the panel offers a
 * selector, because a phone cannot hold the model plus four columns.
 */
export const SELECTOR_THRESHOLD = 2;

export function needsSelector(entries: GuideEntry[]): boolean {
  return entries.length > SELECTOR_THRESHOLD;
}

/**
 * Columns for `twsKt`, in file order. `selected` is a guide id, or `null` for
 * all of them; a selection naming a guide that is no longer committed falls
 * back to all, so removing a file cannot empty the panel.
 */
export function guideColumns(
  entries: GuideEntry[],
  twsKt: number,
  selected: string | null = null,
): GuideColumn[] {
  const filter = selected !== null && entries.some((e) => e.id === selected) ? selected : null;
  return entries
    .filter((e) => filter === null || e.id === filter)
    .map((e) => ({ ...e, rec: e.guide ? guideRecommendation(e.guide, twsKt) : null }));
}

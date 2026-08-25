/**
 * Desktop keyboard shortcuts for the race screen (audit ux-02 M-13).
 *
 * Pure: the mapping from a keystroke to an intent, so the whole shortcut table
 * is unit-testable and the component is left with a switch. `[`/`]` are not
 * here — they nudge whichever slider has focus and live in `Slider.svelte`,
 * which is the only thing that knows the step.
 */

export type KeyAction =
  | { type: 'pointOfSail'; index: number }
  | { type: 'applyOptimum' }
  | { type: 'undo' }
  /** Swap between the two trims being compared (cockpit phase 05). */
  | { type: 'abCompare' }
  /** Play a gust through the trim on screen, or stop the one playing. */
  | { type: 'puffReplay' }
  /** Jump to a sail panel's first control (cockpit phase 03). */
  | { type: 'focusPanel'; panel: PanelId }
  | { type: 'help' };

/** Panels the keyboard can jump to, and the id of each one's control column. */
export type PanelId = 'mainsail' | 'headsail' | 'helm' | 'rig';

/** The element the `m` / `j` / `h` / `r` jump looks inside for a control. */
export function panelControlsId(panel: PanelId): string {
  return `${panel}-controls`;
}

/** The id of a panel's heading. `Panel` labels the section by it. */
export function panelTitleId(panel: PanelId): string {
  return `${panel}-title`;
}

/**
 * The panel's own `<section>`, found through the heading that labels it —
 * the keyboard jump and the phone tab strip both scroll it into view, and
 * neither should have to know the panels' markup.
 */
export function panelSection(panel: PanelId): HTMLElement | null {
  return document.getElementById(panelTitleId(panel))?.closest('section') ?? null;
}

/** The four panels, in cockpit order, with the phone tab strip's labels. */
export const PANELS: { id: PanelId; short: string }[] = [
  { id: 'mainsail', short: 'Main' },
  { id: 'headsail', short: 'Jib' },
  { id: 'helm', short: 'Helm' },
  { id: 'rig', short: 'Rig' },
];

/** The keystroke fields the mapping reads. A `KeyboardEvent` satisfies it. */
export interface KeyStroke {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

const NON_TEXT_INPUTS = new Set(['range', 'checkbox', 'radio', 'button', 'submit', 'reset']);

/**
 * Is focus somewhere the keystroke belongs to the user, not the app? A range
 * input is not: it is a slider, and `[`/`]` are exactly what you want there.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.tagName !== 'string') return false;
  if (el.isContentEditable) return true;
  if (el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') return true;
  if (el.tagName !== 'INPUT') return false;
  return !NON_TEXT_INPUTS.has((el as HTMLInputElement).type);
}

export function keyAction(stroke: KeyStroke, typing: boolean): KeyAction | null {
  if (typing || stroke.ctrlKey || stroke.metaKey || stroke.altKey) return null;
  if (stroke.key >= '1' && stroke.key <= '5') {
    return { type: 'pointOfSail', index: Number(stroke.key) - 1 };
  }
  if (stroke.key === 'o') return { type: 'applyOptimum' };
  if (stroke.key === 'u') return { type: 'undo' };
  if (stroke.key === 'b') return { type: 'abCompare' };
  if (stroke.key === 'p') return { type: 'puffReplay' };
  if (stroke.key === 'm') return { type: 'focusPanel', panel: 'mainsail' };
  if (stroke.key === 'j') return { type: 'focusPanel', panel: 'headsail' };
  if (stroke.key === 'h') return { type: 'focusPanel', panel: 'helm' };
  if (stroke.key === 'r') return { type: 'focusPanel', panel: 'rig' };
  if (stroke.key === '?') return { type: 'help' };
  return null;
}

/** The help sheet's table, and the only place the bindings are written down. */
export const SHORTCUTS: { keys: string; what: string }[] = [
  { keys: '1 – 5', what: 'Point of sail: close-hauled to run' },
  { keys: '[  ]', what: 'Nudge the focused slider one step' },
  { keys: '←  →', what: 'Nudge the focused slider one step' },
  { keys: 'm', what: 'Jump to the Mainsail controls' },
  { keys: 'j', what: 'Jump to the Headsail controls (Gennaker under the kite)' },
  { keys: 'h', what: 'Jump to the Helm panel' },
  { keys: 'r', what: 'Jump to the Rig panel' },
  { keys: 'o', what: 'Apply optimum' },
  { keys: 'u', what: 'Back to my trim' },
  { keys: 'b', what: 'A/B: swap to the other trim' },
  { keys: 'p', what: 'Replay a gust (again to stop)' },
  { keys: '?', what: 'This list' },
];

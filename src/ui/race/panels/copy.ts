/**
 * One lookup for a cockpit panel's explain sheet. A panel row can be a
 * control (`EXPLAIN`, keyed by control id) or an instrument (`READOUT_EXPLAIN`,
 * keyed by metric), and the sheet should not care which — so the title and the
 * paragraph come from here rather than from a `{#if}` in every panel.
 */
import { EXPLAIN, READOUT_EXPLAIN } from '../../explain';
import { CONTROLS } from '../store.svelte';

/** Titles for the readouts, which have no `ControlSpec` to take a label from. */
const READOUT_TITLES: Record<string, string> = {
  leechStall: 'Main leech stall',
  jibStripe: 'Jib leech stripe',
  batten: 'Top batten angle',
  draft: 'Draft depth',
  sag: 'Headstay sag',
  kiteTwist: 'Kite twist',
  heel: 'Heel angle',
  helm: 'Helm load',
  rake: 'Mast rake',
  prebend: 'Prebend',
};

/** Sheet title for a control or a readout, or an empty string for neither. */
export function explainTitle(id: string | null): string {
  if (!id) return '';
  return CONTROLS[id]?.label ?? READOUT_TITLES[id] ?? '';
}

/** Sheet body for a control or a readout, or an empty string for neither. */
export function explainText(id: string | null): string {
  if (!id) return '';
  return EXPLAIN[id] ?? READOUT_EXPLAIN[id] ?? '';
}

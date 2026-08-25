/**
 * The Gennaker panel's words: the trim cue, the honesty note, and the mode
 * line from the downwind playbook. Pure, so the copy is unit-testable rather
 * than buried in a component nothing can assert on.
 *
 * Everything here is prose from the research
 * (`docs/research/2026-08-25-spinnaker/03-trimming-best-practice.md`); the
 * only numbers are the sailmakers' own band boundaries, quoted with the
 * disagreement intact rather than averaged.
 *
 * **Tier C throughout.** The four downwind controls reach no number in the
 * solver (ADR 0017), so none of this is a target to dial in.
 */
import type { RaceMode } from './store.svelte';

/**
 * The one cue the panel carries. Doc 03 §3: every source agrees on it in
 * displacement and soaking modes, and `downwindPlay` says where it stops
 * being true.
 */
export const KITE_CUE =
  'Ease until the luff curls, then trim — sheet is the whole trim; everything else is set around it.';

/**
 * Why the four sliders move the picture and nothing else. ORC §5.6.3 — not
 * Table 5.7 — is the one line that matters: it sets the spinnaker's
 * blanketing factor `bk(β) = 1` at every angle. The mainsail's `fm` is 0 for
 * sloops and the jib's is 0 for a non-overlapping jib, so for a J/70 the VPP
 * carries no main-shadow term anywhere — which is exactly the mechanism the
 * sprit and the tack line exist to fight (research 2026-08-25-spinnaker doc
 * 01 §2.6, ADR 0017).
 */
export const DIRECTION_ONLY =
  'Direction only: these four move the drawn sail, not the numbers — the VPP has no main-shadow term, so the sprit and tack line act on a mechanism the solver does not contain.';

/**
 * Wing-on-wing starts to work here.
 * prov: North speed guide / Doyle / five-modes, research 03 §2.2 (`T2` `T4` `T5`).
 */
export const WING_MIN_KT = 10;
/**
 * Below this, easing the tack does not rotate the luff to weather.
 * prov: North five modes, research 03 §2.2 (`T5`) — "only above ~9 kt".
 */
export const SOAK_MIN_KT = 9;
/**
 * Lazy planing starts about here; below it there is no plane to hold.
 * prov: research 03 §2.3, the sailmakers' 13–16 kt marginal band. Doyle's own
 * guide has the typo "24 to 15 knots" for it; 14–15 kt reads from context.
 */
export const PLANING_MIN_KT = 13;
/**
 * Past this the curl is trimmed out and held rather than chased.
 * prov: research 03 §3 — North/Healy and the 20 kt speed guide (`T6` `T2`).
 * The band edge is the sources'; that curl-and-trim is a *displacement*
 * technique is the synthesis the doc argues for, not a hedge.
 */
export const CURL_OUT_KT = 15;

/** One short line for the mode being steered, plus the band caveat if it applies. */
export interface DownwindPlay {
  line: string;
  /** Present when the wind on screen does not suit the mode selected. */
  caveat?: string;
}

const LINES: Record<'plane' | 'soak' | 'wing' | 'vmg', string> = {
  vmg: 'VMG: sail high of the run, tack line down, sheet eased to the curl and trimmed back.',
  soak: 'Soak: tack up to rotate the luff to weather, then sail as low as the kite stays asleep.',
  plane:
    'Plane: tack line down, backstay on, jib out — trim the curl out and hold it, and gear-change on the mainsheet.',
  wing: 'Wing on wing: steady weather heel, steer by the masthead fly, and call the turns left and right.',
};

/**
 * The playbook line for one downwind mode at one wind speed (doc 03 §2).
 *
 * The caveat is the finding, not decoration: "ease to the curl" is a
 * displacement technique, and a trainer that shows it as universal teaches the
 * wrong thing above about 15 kt (§3).
 */
export function downwindPlay(mode: RaceMode, twsKt: number): DownwindPlay {
  const key = mode === 'plane' || mode === 'soak' || mode === 'wing' ? mode : 'vmg';
  const line = LINES[key];

  if (key === 'plane' && twsKt < PLANING_MIN_KT) {
    return {
      line,
      caveat: `Under ${PLANING_MIN_KT} kt there is no plane to hold — soak or sail VMG.`,
    };
  }
  if (key === 'soak' && twsKt < SOAK_MIN_KT) {
    return {
      line,
      caveat: `Under ${SOAK_MIN_KT} kt the tack-up rotation does nothing — keep it down.`,
    };
  }
  if (key === 'wing' && twsKt < WING_MIN_KT) {
    return { line, caveat: `Wing mode starts to work around ${WING_MIN_KT} kt.` };
  }
  if ((key === 'vmg' || key === 'soak') && twsKt > CURL_OUT_KT) {
    return {
      line,
      caveat: `Over ${CURL_OUT_KT} kt trim the curl out and hold it: curl-and-trim is a displacement technique.`,
    };
  }
  // The tack line is the corpus's sharpest disagreement — 0 to 12 inches
  // across four J/70 sources — so the panel shows the band, never a number.
  if (key === 'soak') {
    return {
      line,
      caveat: 'Tack ease when running: 0–12 in across four sources. Show the band, not a number.',
    };
  }
  return { line };
}

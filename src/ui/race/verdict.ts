/**
 * One sentence of state, not data (research 2026-08-25-cockpit §4 pattern 2:
 * the decision-unit strip states the verdict, the cells carry the numbers).
 *
 * The instrument bar already shows boat speed, VMG, heel and helm. This line
 * says what that adds up to and, when there is a gap to the optimum, the one
 * cue that most likely explains it. Pure: no DOM, no store.
 */
import type { SolveResult } from '../../core/types';
import { objectiveKt, type Objective } from './store.svelte';

/** Gap below which the two trims are the same trim at the precision shown. */
export const ON_TARGET_KT = 0.02;

/** Main leech stalled past this fraction is over-trimmed. prov: assumed, above the guide's 50–70 % band. */
const STALL_HIGH = 0.7;
/** Below this the leech is flying clean, which upwind means there is height on the table. prov: assumed */
const STALL_LOW = 0.3;
/** Stripe index below this reads as hooked inside the 18" stripe. prov: assumed */
const STRIPE_HOOKED = 0.5;
/** Helm load past this is the rudder braking rather than steering. prov: assumed */
const HELM_HEAVY = 1.2;

export interface VerdictInput {
  result: SolveResult | null;
  /** What the solver's optimal trim reaches here, if it has answered. */
  target?: { bsKt?: number; vmgKt?: number };
  objective: Objective;
  /** The coach line's probe sentence, used when no instrument explains the gap. */
  coach?: string;
}

/**
 * The cue that most likely explains a gap to the optimum, in the order a
 * trimmer would check them: the main's leech first (it is the biggest single
 * lever), then the jib's, then the helm.
 */
function cue(result: SolveResult, objective: Objective): string | undefined {
  const i = result.instruments;
  const stall = i.leechStallFrac.value;
  if (stall > STALL_HIGH) return 'main leech stalled, ease';
  if (stall < STALL_LOW && objective === 'vmgUp') return 'main leech flowing, trim on';
  if (i.jibLeechStripe !== undefined && i.jibLeechStripe.value < STRIPE_HOOKED)
    return 'jib leech hooked, lead aft';
  if (Math.abs(i.helmLoad.value) > HELM_HEAVY) return 'heavy helm, flatten';
  return undefined;
}

/**
 * One sentence for the cockpit's verdict line.
 *
 * The gap is signed the same way the readouts' delta is (audit ux-02 M-09):
 * positive means the target is faster than you, downwind included, because
 * `objectiveKt` has already flipped VMG to leeward so that more is better.
 */
export function verdict({ result, target, objective, coach }: VerdictInput): string {
  if (!result) return 'Solving…';
  if (!result.converged) return 'Solver did not settle';

  const to = objective === 'speed' ? target?.bsKt : target?.vmgKt;
  if (to === undefined) return 'Finding the optimum…';

  // Same flip `objectiveKt` applies, so the two sides are in one space.
  const targetKt = objective === 'vmgDown' ? -to : to;
  const gap = targetKt - objectiveKt(objective, result);
  if (Math.abs(gap) < ON_TARGET_KT) return 'On target.';

  const head = `${Math.abs(gap).toFixed(2)} kt ${gap > 0 ? 'below' : 'above'} target`;
  const why = cue(result, objective) ?? coach;
  return why ? `${head}: ${why}` : `${head}.`;
}

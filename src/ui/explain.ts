/**
 * Expert-register copy for the race screen.
 *
 * `EXPLAIN` is the tap-to-explain paragraph per control id (every id in
 * `data/boats/j70.json` controls). `MOVES` is the coach line's verb + second
 * clause, keyed by control and direction. Prose only, no modelled numbers, so
 * nothing here needs a `prov:` tag; the one rule reference is the class rule.
 */

export type Dir = 1 | -1;

export const EXPLAIN: Record<string, string> = {
  upperTurns:
    'Uppers set forestay tension and tip support. Adding turns straightens the tip, tightens the forestay for a flatter jib entry, and stiffens the whole rig against backstay load. Committed at the dock — class rule C.9.5(a) locks standing rigging from leaving the dock until racing finishes for the day — so tune it to the forecast band, not to the first beat.',
  lowerTurns:
    'Lowers hold the lower mast forward or let it sag aft, which is where prebend comes from. More turns pull the middle aft and take depth out of the bottom of the main; fewer let the mast bow forward and power the lower third up. Chop wants a straighter lower mast and a deeper section than flat water does.',
  forestayMm:
    'Forestay length sets rake, and rake moves the centre of effort aft: more helm and more feel in light air, a taller slot, a slower boat if you overdo it. Standing the rig up lowers the centre of effort for breeze. Rake and prebend are coupled, so re-check lowers after any change here.',
  backstay:
    'Backstay does two jobs at once: it bends the mast, flattening the main and opening its leech, and it tensions the forestay, straightening the jib entry. The primary upwind depower gear — first thing on in a build, first thing off in a lull.',
  mainsheet:
    'Once the traveller carries the boom, mainsheet is leech tension rather than boom angle. Trim to load the leech, close the exit and gain height; ease to open it, shed heel and gain speed. Steer it with the top leech telltale, not with the boom position.',
  traveller:
    'Traveller sets boom angle without changing leech load. Up to weather keeps the leech working at the low sheet loads light air needs; dropping it dumps side force in a puff while the sheet — and therefore the twist you set — stays put.',
  cunningham:
    'Cunningham drags draft forward and opens the upper leech as the luff stretches under load. On when the entry gets round and the helm starts loading up; off in light air, where luff wrinkles cost nothing and depth is worth everything.',
  outhaul:
    'Outhaul is lower-main depth. Out flattens the bottom third and opens the foot for pointing and control; in adds depth for acceleration out of a tack and for driving through chop.',
  vang: 'Vang holds the boom down when the sheet is eased, so it owns leech tension anywhere the sheet is not: reaching, running, and every ease in a blow. Upwind it is the safety valve that keeps the ease from turning into a twist-off.',
  jibSheet:
    'Jib sheet sets slot width and jib leech tension together. Harder for height in flat water; eased for a wider slot, more twist and quicker acceleration once the bow is down. It is also the fastest gear you have for a bad lane.',
  jibLead:
    'Lead position trades foot depth against leech tension. Forward closes the leech and deepens the foot for power; aft opens the top and flattens the foot to depower and point in breeze. Read it off the luff telltales breaking together.',
  inhauler:
    'Inhauler pulls the clew inboard for a narrower sheeting angle and more height, at the cost of drag and stall margin. Worth it in flat water with the crew on the rail; expensive in chop, where the boat needs a wider groove to steer in.',
  mainHalyard:
    'Main halyard fine-tune moves draft fore and aft with a longer lever than the cunningham. Use it to reset draft position after a rake or backstay change, not as a live gear on the beat.',
  jibHalyard:
    'Jib halyard tension controls luff sag and therefore entry angle. More tension straightens the entry and moves draft forward for pointing; less lets the luff sag round for a wider, more forgiving groove.',
  kiteHalyard:
    'Kite halyard sets luff length and how far the head can rotate to weather. Ease it to project the sail out of the main’s shadow at deep angles; snug it when reaching and the entry needs to stay flat and stable.',
  tackLine:
    'Tack line sets luff tension and tack height. Down and tight for a straight entry when reaching; eased to lift the tack and let the sail rotate to weather when running deep.',
  kiteSheet:
    'Kite sheet is the whole downwind trim: ease until the luff curls, then trim. Every other downwind control is a slower adjustment made around it.',
  sprit:
    'Bowsprit position moves the tack forward, out of the main’s disturbed air, trading projected area against rotation. Downwind is the weakest part of any parametric VPP, so treat this one as a trend, not a number.',
};

/**
 * One paragraph per readout (audit ux-02 M-10). Keyed by the metric, not by
 * the label, so renaming a label does not orphan its explanation.
 */
export const READOUT_EXPLAIN: Record<string, string> = {
  bsp: 'Boat speed through the water, in knots, at the trim and condition on screen. It is the solver’s converged answer, not a measurement: treat it as what this boat should do here, and the tier badge as how much of that to believe.',
  height:
    'True wind angle — the angle between the wind and the bow, so 0° is head to wind and 180° is dead downwind. Upwind, a smaller angle is pointing higher; on a run it is sailing deeper. It is the angle you set, not one the model chooses, except when a point-of-sail chip solves for the VMG-optimal one.',
  vmg: 'Velocity made good: the part of your boat speed that goes towards the mark, upwind or downwind. Pointing higher but slower can lower it, and footing off faster can raise it, which is why it, and not boat speed, is the number the coach line and Apply optimum chase on a beat or a run.',
  heel: 'Heel angle in degrees, from the righting moment the crew and hull provide against the sails’ heeling moment. Too much and the rudder loads up and the foils stall; too little upwind and the rig is not loaded. Downwind the model is weakest here — see the tier badge, and ASSUMPTIONS.md.',
  leeway:
    'The angle between where the bow points and where the boat actually goes: the keel needs some slip to make side force. It grows as you slow down or load up, so a big number in chop usually means the boat is being sailed too high for the sea state.',
  awa: 'Apparent wind angle — the wind the sails actually see, which is the true wind combined with the boat’s own motion. It is always tighter than TWA, and it is what the trim is set to, which is why the sheeting angle upwind looks so narrow.',
  flat: 'The ORC VPP depowering parameter: one is the sail plan at full power, and anything lower is the model flattening the sails to keep the boat on its feet. It is a model internal rather than something you can read on the boat — watch it fall as the breeze builds and the rig depowers.',
};

interface Move {
  /** Imperative first clause, including the increment. */
  verb: string;
  /** Second clause: what is wrong now. */
  why: string;
}

/** Coach-line phrasing for the controls the store probes. */
export const MOVES: Record<string, Record<'up' | 'down', Move>> = {
  backstay: {
    up: { verb: 'More backstay', why: 'main is too full for this load' },
    down: { verb: 'Ease backstay', why: 'you are giving away power up top' },
  },
  mainsheet: {
    up: { verb: 'Trim mainsheet one click', why: 'leech is twisting off and losing height' },
    down: { verb: 'Ease mainsheet one click', why: 'leech is stalled' },
  },
  traveller: {
    up: { verb: 'Traveller up one', why: 'boom is too far to leeward for this load' },
    down: { verb: 'Traveller down one', why: 'boat is over-heeled and the rudder is loading' },
  },
  jibLead: {
    up: { verb: 'Lead car back one hole', why: 'jib leech is choking the slot' },
    down: { verb: 'Lead car forward one hole', why: 'top of the jib is falling open' },
  },
};

/**
 * One imperative sentence: what to move, what it buys, why. `metric` names
 * what the number is — "VMG" close-hauled and running, "boat speed" on a
 * reach, where VMG to a mark you are not fetching means nothing (ux-01 H-05).
 */
export function coachSentence(control: string, dir: Dir, gainKt: number, metric: string): string {
  const move = MOVES[control]?.[dir > 0 ? 'up' : 'down'];
  if (!move) return '';
  return `${move.verb}: +${gainKt.toFixed(2)} kt ${metric}, ${move.why}.`;
}

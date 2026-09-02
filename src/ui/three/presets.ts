/**
 * The four sighting views a sailor actually uses, as camera poses. Pure and
 * `three`-free, so the hero header can list the chips before the 3D chunk has
 * arrived — and so `?view=` can be validated without loading a renderer.
 *
 * Poses are in the boat frame of `conventions.ts` with the boat on starboard
 * tack; `SailView3D` mirrors z by the tack, so "leeward quarter" stays leeward
 * on both tacks. prov: assumed — framing, not physics.
 */
export type PresetId = 'helm' | 'astern' | 'leeward' | 'luff' | 'top';

export interface Pose {
  position: [number, number, number];
  target: [number, number, number];
}

export const PRESET_ORDER: PresetId[] = ['helm', 'astern', 'leeward', 'luff', 'top'];

export const PRESET_LABEL: Record<PresetId, string> = {
  helm: 'Helm',
  astern: 'Astern',
  leeward: 'Leeward',
  luff: 'Up the luff',
  top: 'Top-down',
};

/**
 * The phone labels, under 720 px. Five chips on one 44 px row is the budget
 * the hero can afford — the full labels wrapped to two rows, 96 px of chrome
 * above a 218 px picture (audit kite-3d-01 H-09) — and only two of the five
 * need shortening to get there. `PRESET_HINT` still carries the long form as
 * the chip's title.
 */
export const PRESET_SHORT: Record<PresetId, string> = {
  helm: 'Helm',
  astern: 'Astern',
  leeward: 'Leeward',
  luff: 'Luff',
  top: 'Top',
};

/** What each view is for, one line, for the chip's title attribute. */
export const PRESET_HINT: Record<PresetId, string> = {
  helm: 'Over the helmsman’s shoulder, looking up the main: leech twist and draft from the back of the boat.',
  astern:
    'Down the leech, on the centreline: reads twist, and the kite alongside the main on a run.',
  leeward: 'The leeward quarter: reads camber and draft position.',
  luff: 'From the tack looking up: reads entry angle and twist together.',
  top: 'From above: reads sheeting angles and the stacked sections.',
};

/** z is positive to starboard here and gets mirrored onto the leeward side. */
export const PRESETS: Record<PresetId, Pose> = {
  // Over the windward quarter, low and looking slightly up the main's leech
  // towards the top batten. An eye actually *at* the tiller cannot work: from
  // 3.4 m aft of the mast heel the masthead subtends 72° and the gooseneck
  // −2°, a 74° span against a 42° lens, so no aim angle holds both boom and
  // masthead. This is the same sight line taken from far enough back to hold
  // them — 27° off the centreline, so it reads as the helm's view and not as
  // Astern's. audit kite-3d-01 H-06.
  helm: { position: [-6.4, 3.15, -2.6], target: [-1.2, 3.8, 0] },
  // Dead astern on the centreline, a little above boom height. A lateral
  // offset (either side) puts the near sail's full face at the camera and
  // the boom — main downwind is out past the corner of the boat — hides
  // whatever is behind it; under the gennaker that was the kite. Centreline
  // needs no tack mirroring and reads the main's leech twist just as well
  // close-hauled.
  astern: { position: [-12.5, 6.2, 0], target: [-1.2, 4.4, 0] },
  // Aimed 0.8 m lower than the first cut, which framed the sails and left the
  // hull on the bottom edge: the leeward quarter is the view that says "this
  // is a boat, heeled this far", and it cannot say it without the sheerline.
  leeward: { position: [-6.6, 3.9, 10.2], target: [-0.9, 3.6, 0] },
  // Ahead of the tack and a little to leeward, sighting up the headsail's
  // luff. Barely off level: the fit preserves only the direction and backs the
  // eye off about 20 m along it, so a sight line that looks gently upward when
  // authored puts the eye metres under the keel once it is fitted — the sea is
  // a single-sided plane, so from below there is no water and no horizon at
  // all. `camera.ts` clamps the eye above the surface as a backstop; this pose
  // is shallow enough not to need it. audit kite-3d-01 H-10.
  luff: { position: [5.0, 3.2, 1.3], target: [-0.6, 3.9, 0] },
  // Not straight down: a vertical camera makes the up-vector degenerate and
  // the boat spins on its own axis as you orbit. Steeply from astern reads
  // the sheeting angles just as well and holds its bearings.
  top: { position: [-10.5, 15.5, 1.6], target: [-1.0, 2.8, 0] },
};

export function isPreset(v: string | undefined): v is PresetId {
  return v !== undefined && (PRESET_ORDER as string[]).includes(v);
}

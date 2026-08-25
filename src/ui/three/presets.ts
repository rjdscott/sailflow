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

/** What each view is for, one line, for the chip's title attribute. */
export const PRESET_HINT: Record<PresetId, string> = {
  helm: 'From the helm, looking up the main: the trimmer’s own view of leech and draft.',
  astern: 'Down the leech: reads twist.',
  leeward: 'The leeward quarter: reads camber and draft position.',
  luff: 'From the tack looking up: reads entry angle and twist together.',
  top: 'From above: reads sheeting angles and the stacked sections.',
};

/** z is positive to starboard here and gets mirrored onto the leeward side. */
export const PRESETS: Record<PresetId, Pose> = {
  // Seated to windward in the cockpit, eye a metre above deck, looking up the
  // main's leech towards the top batten.
  helm: { position: [-3.4, 1.0, -0.9], target: [-1.3, 5.5, 0.3] },
  astern: { position: [-12.5, 4.4, 1.4], target: [-1.2, 4.2, 0] },
  // Aimed 0.8 m lower than the first cut, which framed the sails and left the
  // hull on the bottom edge: the leeward quarter is the view that says "this
  // is a boat, heeled this far", and it cannot say it without the sheerline.
  leeward: { position: [-6.6, 3.9, 10.2], target: [-0.9, 3.6, 0] },
  luff: { position: [4.2, 0.9, 1.1], target: [-0.6, 6.2, 0] },
  // Not straight down: a vertical camera makes the up-vector degenerate and
  // the boat spins on its own axis as you orbit. Steeply from astern reads
  // the sheeting angles just as well and holds its bearings.
  top: { position: [-10.5, 15.5, 1.6], target: [-1.0, 2.8, 0] },
};

export function isPreset(v: string | undefined): v is PresetId {
  return v !== undefined && (PRESET_ORDER as string[]).includes(v);
}

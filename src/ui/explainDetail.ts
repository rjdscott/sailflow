/**
 * The illustrated half of the control explainers (audit ux-01 L-03).
 *
 * A module of its own, and not part of `explain.ts`, for one reason: the
 * paragraph copy in `explain.ts` is reached from the instrument band, which is
 * on the first screen, while all of this is reached only from a lazily
 * imported sheet or from the Learn tier's inline block. Sharing a file would
 * hoist it into the entry chunk and spend the first-load budget (ADR 0014) on
 * drawings nobody has asked for yet.
 */

/**
 * The nine schematics `ExplainDiagram.svelte` draws. Every control on the boat
 * does one of these nine things to the sail plan, so nine drawings cover
 * eighteen controls and a reader learns the vocabulary once (audit ux-01 L-03).
 */
export type DiagramKind =
  'bend' | 'twist' | 'depth' | 'draft' | 'slot' | 'rake' | 'sag' | 'boom' | 'kite';

/** The drawing's accessible name — it is a schematic, so it says so. */
export const DIAGRAM_LABELS: Record<DiagramKind, string> = {
  bend: 'Schematic: a straight mast and a full main, against a mast bowed forward and the main flattened over it.',
  twist: 'Schematic: two sail sections up the luff, the upper one rotated open off the lower.',
  depth: 'Schematic: one chord drawn twice, once flat and once full.',
  draft: 'Schematic: the same depth with its deepest point forward, then aft, along the chord.',
  slot: 'Schematic: the jib leech against the main, and the slot between them opening.',
  rake: 'Schematic: a plumb mast against one raked aft.',
  sag: 'Schematic: a straight forestay against one bowed to leeward under load.',
  boom: 'Schematic: looking down at the traveller track, the boom swinging out to leeward.',
  kite: 'Schematic: from astern, the kite rotating out of the main’s shadow to weather.',
};

/**
 * The illustrated half of a control explainer: which schematic, and what
 * moving the control actually changes. Three or four clauses, in the order a
 * trimmer would notice them, and qualitative throughout — a number here would
 * need a `prov:` tag, and none of these are modelled outputs (CLAUDE.md).
 */
export interface ExplainDetail {
  diagram: DiagramKind;
  /** "What it changes": short noun phrases, not sentences. */
  changes: string[];
}

export const EXPLAIN_DETAIL: Record<string, ExplainDetail> = {
  upperTurns: {
    diagram: 'sag',
    changes: [
      'Forestay tension, and so how much the jib luff sags',
      'Support at the top of the mast under backstay load',
      'How much backstay it takes to get the same bend',
    ],
  },
  lowerTurns: {
    diagram: 'bend',
    changes: [
      'Prebend: how far the middle of the mast bows forward with the backstay off',
      'Depth in the bottom third of the main',
      'How the main takes backstay later in the day',
    ],
  },
  forestayMm: {
    diagram: 'rake',
    changes: [
      'Mast rake, and with it the whole sail plan fore and aft',
      'Weather helm and feel on the tiller',
      'Prebend, indirectly — re-check the lowers after moving it',
    ],
  },
  backstay: {
    diagram: 'bend',
    changes: [
      'Mast bend, which flattens the main and opens its leech',
      'Forestay tension, which straightens the jib entry',
      'Total power: the first gear on in a build, the first off in a lull',
    ],
  },
  mainsheet: {
    diagram: 'twist',
    changes: [
      'Main leech tension, and so twist at the top of the sail',
      'Pointing against acceleration',
      'Heel, through how much of the leech is loaded',
    ],
  },
  traveller: {
    diagram: 'boom',
    changes: [
      'Boom angle to the centreline',
      'Side force, without touching the twist the sheet set',
      'Angle of attack on the main as a whole',
    ],
  },
  cunningham: {
    diagram: 'draft',
    changes: [
      'Draft position: it drags the deepest point forward',
      'Entry angle at the luff',
      'Upper leech, which opens as the luff tension comes on',
    ],
  },
  outhaul: {
    diagram: 'depth',
    changes: [
      'Depth in the bottom third of the main',
      'How open the foot is along the boom',
      'Acceleration out of a tack against pointing',
    ],
  },
  vang: {
    diagram: 'twist',
    changes: [
      'Leech tension anywhere the sheet is eased — reaching and running',
      'How far the boom lifts when the sheet goes out in a puff',
      'Some mast bend, once it is loaded hard',
    ],
  },
  jibSheet: {
    diagram: 'slot',
    changes: [
      'Slot width between the jib leech and the main',
      'Jib leech tension, and so twist in the top of the sail',
      'How wide a groove the boat has to steer in',
    ],
  },
  jibLead: {
    diagram: 'twist',
    changes: [
      'The balance between foot depth and leech tension',
      'Twist at the head of the jib',
      'Which telltale breaks first up the luff',
    ],
  },
  inhauler: {
    diagram: 'slot',
    changes: [
      'Sheeting angle: it pulls the clew inboard',
      'Pointing, at the cost of drag and stall margin',
      'How much warning you get before the jib stalls',
    ],
  },
  mainHalyard: {
    diagram: 'draft',
    changes: [
      'Draft position, with a longer lever than the cunningham',
      'Luff tension over the whole sail rather than just the bottom',
      'Nothing the speed model reads — it is a shape adjustment here',
    ],
  },
  jibHalyard: {
    diagram: 'sag',
    changes: [
      'Jib luff sag, and so entry angle',
      'Draft position in the jib',
      'How forgiving the groove is off the wind shifts',
    ],
  },
  kiteHalyard: {
    diagram: 'kite',
    changes: [
      'Luff length, and so how far the head can rotate to weather',
      'How far the sail projects out of the main’s shadow',
      'Stability of the entry when the apparent wind comes forward',
    ],
  },
  tackLine: {
    diagram: 'kite',
    changes: [
      'Tack height off the sprit',
      'Luff tension, and so how straight the entry is',
      'Rotation to weather when running deep',
    ],
  },
  kiteSheet: {
    diagram: 'kite',
    changes: [
      'Angle of attack across the whole sail',
      'Where the luff curls, which is the trim reference downwind',
      'Everything else downwind is adjusted around it',
    ],
  },
  sprit: {
    diagram: 'kite',
    changes: [
      'How far the tack sits ahead of the main’s disturbed air',
      'Projected area against rotation',
      'A trend only: downwind is the weakest part of any parametric VPP',
    ],
  },
};

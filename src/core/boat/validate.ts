import type { BoatDefinition, ControlSpec, ProvenanceEntry } from '../types';

/**
 * Validate a boat JSON before the solver touches it. Returns a list of
 * problems; empty means valid. Hand-rolled on purpose: the schema is one
 * file and a dependency would be bigger than this function.
 */
export function validateBoat(raw: unknown): string[] {
  const p: string[] = [];
  if (!isObj(raw)) return ['boat: not an object'];
  const b = raw as Partial<BoatDefinition>;

  if (b.schemaVersion !== 1) p.push(`schemaVersion: expected 1, got ${String(b.schemaVersion)}`);
  if (typeof b.id !== 'string' || !b.id) p.push('id: missing');

  for (const [section, keys] of Object.entries(REQUIRED_NUMBERS)) {
    const obj = (b as Record<string, unknown>)[section];
    if (!isObj(obj)) {
      p.push(`${section}: missing`);
      continue;
    }
    for (const k of keys) {
      const v = obj[k];
      if (typeof v !== 'number' || !Number.isFinite(v))
        p.push(`${section}.${k}: not a finite number`);
      else if (v <= 0) p.push(`${section}.${k}: must be positive`);
    }
  }

  if (isObj(b.crew)) {
    const c = b.crew;
    if (typeof c.minKg === 'number' && typeof c.maxKg === 'number' && c.minKg >= c.maxKg)
      p.push('crew: minKg must be < maxKg');
    if (c.maxLegsOut !== 2) p.push('crew.maxLegsOut: class rule allows exactly 2');
  }

  const sails = b.sails;
  if (!isObj(sails)) p.push('sails: missing');
  else
    for (const id of ['main', 'jib', 'asym'] as const) {
      const s = sails[id];
      if (!isObj(s)) {
        p.push(`sails.${id}: missing`);
        continue;
      }
      if (typeof s.ratedAreaM2 !== 'number' || s.ratedAreaM2 <= 0)
        p.push(`sails.${id}.ratedAreaM2: must be positive`);
      if (!ORC_TABLES.has(String(s.orcTable))) p.push(`sails.${id}.orcTable: unknown table`);
    }

  const controls = b.controls;
  if (!isObj(controls)) p.push('controls: missing');
  else {
    for (const id of REQUIRED_CONTROLS) if (!(id in controls)) p.push(`controls.${id}: missing`);
    for (const [id, spec] of Object.entries(controls)) p.push(...checkControl(id, spec));
  }

  if (!isObj(b.calibration)) p.push('calibration: missing (may be empty)');
  else
    for (const [k, v] of Object.entries(b.calibration))
      if (typeof v !== 'number' || !Number.isFinite(v)) p.push(`calibration.${k}: not finite`);

  p.push(...checkProvenance(b));
  return p;
}

function checkControl(id: string, spec: unknown): string[] {
  const p: string[] = [];
  if (!isObj(spec)) return [`controls.${id}: not an object`];
  const s = spec as Partial<ControlSpec>;
  if (!['dock', 'race', 'down'].includes(String(s.mode))) p.push(`controls.${id}.mode: invalid`);
  for (const k of ['min', 'max', 'step'] as const)
    if (typeof s[k] !== 'number' || !Number.isFinite(s[k]))
      p.push(`controls.${id}.${k}: not finite`);
  if (typeof s.min === 'number' && typeof s.max === 'number' && s.min >= s.max)
    p.push(`controls.${id}: min must be < max`);
  if (typeof s.step === 'number' && s.step <= 0) p.push(`controls.${id}.step: must be positive`);
  if (s.purchaseMin !== undefined || s.purchaseMax !== undefined) {
    const lo = s.purchaseMin ?? s.purchaseMax ?? 0;
    const hi = s.purchaseMax ?? s.purchaseMin ?? 0;
    if (lo < 1 || hi < lo) p.push(`controls.${id}: purchase range invalid`);
  }
  return p;
}

/** Every numeric leaf outside `calibration`/`provenance`/`sources` needs a provenance row. */
function checkProvenance(b: Partial<BoatDefinition>): string[] {
  const p: string[] = [];
  const prov = b.provenance;
  if (!isObj(prov)) return ['provenance: missing'];
  const sources = isObj(b.sources) ? b.sources : {};
  for (const [path, entry] of Object.entries(prov)) {
    const e = entry as Partial<ProvenanceEntry>;
    if (!PROV_KINDS.has(String(e.kind))) p.push(`provenance.${path}.kind: invalid`);
    if (typeof e.source !== 'string' || !(e.source in sources))
      p.push(`provenance.${path}.source: unknown source "${String(e.source)}"`);
  }
  for (const leaf of numericLeaves(b, ['calibration', 'provenance', 'sources', 'schemaVersion']))
    if (!(leaf in prov)) p.push(`provenance: no entry for ${leaf}`);
  return p;
}

export function numericLeaves(obj: unknown, skipTop: string[] = [], prefix = ''): string[] {
  if (!isObj(obj)) return [];
  const out: string[] = [];
  for (const [k, v] of Object.entries(obj)) {
    if (!prefix && skipTop.includes(k)) continue;
    const path = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'number') out.push(path);
    else if (isObj(v)) out.push(...numericLeaves(v, [], path));
  }
  return out;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const REQUIRED_NUMBERS: Record<string, string[]> = {
  hull: [
    'loaM',
    'lwlM',
    'beamM',
    'bwlM',
    'draftM',
    'dispKg',
    'wettedM2',
    'keelAreaM2',
    'keelSpanM',
    'kgM',
    'gmM',
  ],
  rig: ['iM', 'jM', 'pM', 'eM', 'mastLenM', 'spreaderZM', 'spreaderLenM', 'chainplateYM'],
  crew: ['minKg', 'maxKg'],
};

const REQUIRED_CONTROLS = [
  'upperTurns',
  'lowerTurns',
  'forestayMm',
  'backstay',
  'mainsheet',
  'traveller',
  'cunningham',
  'outhaul',
  'vang',
  'jibSheet',
  'jibLead',
  'inhauler',
  'mainHalyard',
  'jibHalyard',
];

const ORC_TABLES = new Set(['5.1', '5.4', '5.6', '5.7', '5.8']);
const PROV_KINDS = new Set(['published', 'measured', 'derived', 'assumed']);

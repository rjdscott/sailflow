/**
 * Writes `validation/report.md`: the polar comparison, the hold-out gate
 * verdict (ADR 0007 boat-speed tolerances and ADR 0023's VMG criterion, over
 * ADR 0012's split), the model's own best dock setup against the North tuning
 * guide, and a plain list of what this model is bad at.
 *
 *   pnpm tsx validation/report.ts
 *
 * Read-only with respect to the boat file (ADR 0007): calibration is written
 * by `calibration/`, never here. Content is deterministic apart from the run
 * date in the header — the boat and calibration hashes identify the model,
 * and a commit stamp could only ever name the pre-merge commit the report was
 * generated on (audit docs-consistency-01 M-09).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_BOAT_ID } from '../src/lib/boat';
import type { DockControls, Forecast } from '../src/core/types';
import { geometryFor } from '../src/core/solve/equilibrium';
import { candidateGrid, lapTimeHours } from '../src/core/solve/dock';
import {
  boat,
  boatHash,
  calibHash,
  compareRow,
  angleRows,
  gateRows,
  loadPolar,
  vmgRows,
  type Comparison,
  HELD_OUT_TWS,
  POLAR_CREW_KG,
  POLAR_SEA_STATE,
  TOL_ANGLE_BS_FRAC,
  TOL_VMG_BS_FRAC,
  TOL_VMG_SHORTFALL_FRAC,
} from './compare';

/**
 * The default class keeps `report.md`: the More screen loads that path with
 * `?raw`, and half a dozen docs cite it. Other classes get a suffix, the same
 * convention `calibration/fit.ts` uses for its residuals — a second class must
 * not overwrite the report the app ships.
 */
const OUT = fileURLToPath(
  new URL(boat.id === DEFAULT_BOAT_ID ? './report.md' : `./report-${boat.id}.md`, import.meta.url),
);
const GEOM = geometryFor(boat);

interface GuideBandRow {
  label: string;
  twsMinKt: number;
  twsMaxKt: number | null;
  uppersTurns: number;
  lowersTurns: number;
}

/**
 * The first tuning guide committed for this class, or `null`. Same rule as
 * `calibration/fit.ts`: a guide belongs to one class, and quoting the J/70's
 * shroud turns at another rig would be the report inventing a disagreement.
 */
function loadGuide(boatId: string): { id: string; bands: GuideBandRow[] } | null {
  const dir = new URL('../data/tuning/', import.meta.url);
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith(`-${boatId}.json`)) continue;
    const raw = JSON.parse(readFileSync(new URL(name, dir), 'utf8')) as {
      source?: { label?: string };
      bands?: GuideBandRow[];
    };
    if (Array.isArray(raw.bands) && raw.bands.length > 0)
      return { id: raw.source?.label ?? name.replace(/\.json$/, ''), bands: raw.bands };
  }
  return null;
}

const GUIDE = loadGuide(boat.id);

/**
 * What this model is bad at **on the default class**. Kept as prose rather
 * than derived, because these are judgements about the model, not
 * measurements of it (ADR 0006) — and they are judgements about *this* boat:
 * every one of them quotes a J/70 number or a J/70 source. `weaknesses()`
 * below is what decides whether they apply to the class being reported.
 */
const DEFAULT_BOAT_WEAKNESSES = [
  '**Heel is tier B, nothing fits it, and it is now short by a fifth rather than two fifths (ADR 0024).** Three published things were wrong at once and all three were transcription. The sail plan sat 0.81 m too low: the mainsail centre of effort was measured from an assumed “boom ~0.9 m above the waterline” where the ORC certificate publishes BAS 0.992 above the sheer, and the sheer at the base of I follows from the certificate’s own freeboards at HBI = 0.715 — so the boom is 1.707 m up. ORC eq (3.5), `HM_total = HM_A + RM4 · FHA` with RM4 = 0.43 · Tmax the vertical centre of lateral resistance below the water plane (eq 4.29), was missing entirely: what heels a boat is the couple between the aero heeling force and the hydro side force, and that arm does not stop at the water plane. And the model multiplied the heeling moment by cos(heel), which neither eq (5.57) nor eq (3.5) carries — ORC puts the one cos(heel) the balance needs on the crew term of the righting moment (eq 4.30), where this model already had it. The heeling arm goes 3.66 → 4.86 m plus 0.59 m of CLR, and upwind VMG heel goes 6.3 → 7.8 at TWS 10 (polar 11.8), 8.0 → 12.9 at 12 (19.7), 10.5 → 15.1 at 14 (20.8), 14.5 → 18.4 at 20 (24.2). What is left is still shown, not absorbed. The righting model is anchored on one published number (`rmMeasuredKgMPerDeg`, 18.5 kg·m/deg) and an assumed 25° knee; crew hiking is a linear ramp to a published 6° reference (ORC VPP 2012 §4.4.3.3) and `hydro.crewArmMul` still holds its defined value. Two candidate mechanisms remain, both published, both deliberately out: ORC’s downwind crew law (VPP 2012 §4.4.3.3 — crew to leeward below 10° of heel, which is exactly why the polar prints a flat 11.5–12.0° downwind column that this model reads as 1°), and the DSYHS/ORC effective-draft law that says the plain `cos(heel)` on the keel span in `hydro/keel.ts` is too weak, nearer cos^1.2 to cos^2.9. One heel mechanism at a time stays attributable (ADR 0022).',

  '**The asymmetric is tier C for anything but speed.** The ORC offwind coefficient set is applied on centreline with no tack-line, sprit or rotation model, so asymmetric heel and leeway are direction-only. The guide’s own downwind advice (ease the tack 4–6 in before planing) has no representation in the physics.',
  '**The offwind sail’s deep-angle drag is a fitted number, not a measurement (ADR 0018).** Above AWA 115° the ORC CD0 is multiplied by `aero.asymCdMul`, ramped to full at 150°. Without it the model made 264 N of drive at TWS 14 / TWA 172° where 351 N is needed, and never soaked at any wind speed below 16 kt. The fitted 2.981 lands inside the published wind-tunnel band once the reference-area conventions are reconciled, but it is standing in for a mechanism the model does not contain — ORC gives the spinnaker no blanketing term, so the main’s shadow on the kite is absent and the sprit and tack line act on nothing.',
  '**The one gated row still failing is the asymmetric, and it now fails on speed.** Held-out TWS 14 asymmetric: 5.0 % fast against a 3 % tolerance and 2.5° off against a 2° one. It was 2.1 % and 3.3° before ADR 0023; the angle improved and the speed did not. That is the offwind side paying for the published heeling arm: the fitted `aero.hbiM` had been buying about 10 % off the induced drag through ORC eq (5.45)’s effective rig height, the spinnaker’s effective height came off it too, and nothing published replaces it until the downwind crew law lands. Every offwind row above 10 kt is now fast, worst at TWS 20 where the planing row reads 15.6 %.',
  '**The downwind optimum is compressed, and the gate no longer catches it.** The model’s best downwind angle sits at 168–169° from 14 kt up, against the polar’s 141.9° → 174.0° over TWS 6–16. Until ADR 0023 that showed up as the last failing gated row — held-out TWS 14 asymmetric, 3.3° against a 2° tolerance — and ADR 0023 stopped gating it, because at that state the model’s VMG is flat to 0.11 % over 168–172°: sailed at the polar’s own 172° it does 6.32 kt against 6.26, 1.0 % fast, so the boat is right and only the argmax on a flat curve is not. The compression is still real and still unfixed; what changed is that the gate now measures it in knots of VMG, where it is worth almost nothing, instead of in degrees, where it looked decisive. It needs a second mechanism (blanketing, tack line, sprit), not a better number.',
  '**Downwind VMG is bimodal.** There is a reaching hump near 145° and a soak hump near 168° with a trough between them, and the two cross between TWS 10 and 12. `optimal()` scans before it refines, which usually picks the global hump — but not at the crossing itself: the fitted TWS 12 row lands on the reaching one at 151.3° against a printed 162.5° and reads 8.6 % fast, the only row in the whole polar outside 3.4 %. Near the crossing the dock-setup ranking is genuinely jumpy too — about 0.19 s/mile, a tenth of the tie band the UI refuses to resolve inside.',
  '**The upwind speed plateau is closed, and the way it closed is a warning about reading a fit.** For two rounds this bullet said the plateau was a model limit that no knob could close, citing `hydro.heelDragK` fitted to 0.919 well inside a bound of 4.0. The knob was not declining headroom, it was anchored wrong: the old assumed form scaled heel drag on *viscous* resistance, burying a friction coefficient of ~0.0029 inside the knob, so even at 4.0 it topped out at about half the penalty the plateau needs. And the stage-1 heel weight, documented as keeping heel "the weakest term", measured at 62 % of the loss — heel drag slows the boat, a slower boat heels less, so the fit was paid to keep the mechanism at zero. ADR 0022 replaced the form with the published Delft heel law normalised at 20°, dropped the heel weight to 0.002 and stopped fitting the crew arm. That closed the plateau. ADR 0023 then cost some of it back: the widest printed jib residual is 4.6 % (TWS 12 at 120°) where it had been 3.4 %, because the fit lost the effective rig height a mis-set HBI had been buying it.',
  '**The whole shape layer is invented.** `rig/state.ts`, `shape/flying.ts` and `shape/toOrc.ts` are sign-correct heuristics with calibration knobs (ADR 0006). No published J/70 data maps turnbuckle turns to shroud tension, tension to forestay sag, or sag to flying shape. Every magnitude in that chain is an assumption; only the signs are tested.',
  '**The 20 kt asymmetric row is a planing row and this is a displacement model.** The ORC polar prints 11.53 kt at TWA 137° in 20 kt, which is the hull up and planing. The residuary curve here has a `hydro.planingRelief` knob whose fallback is zero, so the model has no planing regime to fit. Treat the 20 kt downwind numbers as out of range, not as a validated answer.',
  '**The source polar is VPP 2011 1.02 and the coefficients implemented are the 2023 edition.** Part of every residual below is ORC’s own revisions between the two, not model error (ADR 0007).',
];

/**
 * The weakness list for the class being reported.
 *
 * A second class does not inherit the default class's list: those bullets name
 * the J/70's righting number, its Speed Guide's VPP edition and its own fitted
 * knobs. What a second class *does* inherit is whatever its own run skipped,
 * which is knowable from the boat and the guide rather than written by hand.
 */
function weaknesses(): string[] {
  if (boat.id === DEFAULT_BOAT_ID) return DEFAULT_BOAT_WEAKNESSES;
  const out = [
    '**The whole shape layer is invented.** `rig/state.ts`, `shape/flying.ts` and `shape/toOrc.ts` are sign-correct heuristics with calibration knobs (ADR 0006). Nothing published maps turnbuckle turns to shroud tension, tension to forestay sag, or sag to flying shape for any class. Every magnitude in that chain is an assumption; only the signs are tested.',
    '**This is one certificate, not a class polar.** An ORC polar is issued per measured hull. ' +
      'ADR 0020 measured the spread across 40 Melges 24 certificates at up to 11.4 %, wider than ' +
      `the ${pct(TOL_VMG_BS_FRAC)} boat-speed tolerance the gate applies — so a failing row may ` +
      "be the model, or may be a different boat. The polar file's source block names which.",
  ];
  if (!GUIDE)
    out.push(
      `**Six rig and shape knobs are unfitted.** No tuning guide is committed for ${boat.id}, ` +
        'so calibration stage 3 (rig + shape) never ran: `rig.EI`, `rig.turnsToN`, `rig.sagK` and the three ' +
        "`shape.*` knobs hold code defaults fitted against another class's rig. Every dock-tune " +
        'number this class reports is tier C until a guide is sourced.',
    );
  if (polarRowsLackHeel())
    out.push(
      "**Heel is unfitted and ungated.** This class's polar publishes no heel column, and since ADR 0022 nothing fits heel on any class anyway (`hydro.crewArmMul` holds its code default); no row below has a heel to compare against. The model heel in the tables is an output nothing checked.",
    );
  return out;
}

/** True when no committed polar row carries a heel angle. */
function polarRowsLackHeel(): boolean {
  return (boat.polar?.rows ?? []).every((r) => r.heelDeg === null);
}

const pct = (f: number) => `${(f * 100).toFixed(1)} %`;
/** Shortfalls live near zero; one decimal would print every passing row as 0.0 %. */
const shortPct = (f: number) => `${(f * 100).toFixed(2)} %`;
const progress = (msg: string) => process.stderr.write(`${msg}\n`);

/**
 * One table row. `gated` is membership of `gateRows()` — every row at a
 * held-out TWS (ADR 0012). Rows at a fitted TWS are shown for completeness
 * but carry no verdict: a fit residual says only that the optimiser worked
 * (ADR 0007), so the tolerance column is blank and the last column says so.
 */
function comparisonRow(c: Comparison, gated: boolean): string {
  const twa = c.twaErrDeg === null ? '—' : `${c.twaErrDeg.toFixed(1)}°`;
  const short = c.vmgShortfallFrac === null ? '—' : shortPct(c.vmgShortfallFrac);
  const label = c.kind === 'angle' ? `${c.polar.twaDeg}° ${c.sail}` : `${c.kind} ${c.sail}`;
  const limit = !gated
    ? '—'
    : c.vmgShortfallFrac === null
      ? `${pct(c.limitBsFrac)}`
      : `${pct(c.limitBsFrac)} / ${pct(TOL_VMG_SHORTFALL_FRAC)}`;
  const verdict = !gated ? 'fit residual' : c.pass ? 'ok' : '**FAIL**';
  return `| ${label} | ${c.polar.bsKt.toFixed(2)} | ${c.model.bsKt.toFixed(2)} | ${pct(c.bsErrFrac)} | ${c.polar.twaDeg.toFixed(1)} | ${c.model.twaDeg.toFixed(1)} | ${twa} | ${short} | ${c.polar.heelDeg === null ? '—' : c.polar.heelDeg.toFixed(1)} | ${c.model.heelDeg.toFixed(1)} | ${limit} | ${verdict} |`;
}

const TABLE_HEAD = [
  '| row | polar bs | model bs | bs err | polar twa | model twa | twa err | vmg shortfall | polar heel | model heel | limit | |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
];

/** North band midpoint TWS. The open-ended top band is read as min + 2 kt. */
function bandMidpoint(b: { twsMinKt: number; twsMaxKt: number | null }): number {
  const mid = b.twsMaxKt === null ? b.twsMinKt + 2 : (b.twsMinKt + b.twsMaxKt) / 2;
  // Below 5 kt neither the polar nor the seed table says anything useful.
  return Math.max(5, Math.round(mid));
}

function main(): void {
  const started = Date.now();
  const polar = loadPolar();
  const out: string[] = [];

  out.push('# Validation report');
  out.push('');
  out.push(`- **Generated:** ${new Date().toISOString().slice(0, 19).replace('T', ' ')} UTC`);
  out.push(`- **Boat:** \`${boat.id}\` — geometry hash \`${boatHash()}\``);
  out.push(
    `- **Calibration:** hash \`${calibHash()}\` — ${Object.keys(boat.calibration).length} fitted parameter(s)`,
  );
  out.push(
    `- **Replay condition:** sea state ${POLAR_SEA_STATE}, crew ${POLAR_CREW_KG} kg, dock rig at the guide base, race trim optimised (prov: assumed — the Speed Guide prints neither).`,
  );
  out.push('');
  out.push(
    'Generated by `pnpm tsx validation/report.ts`. Everything below except the date is deterministic. The boat and calibration hashes above identify the model these numbers came from; a commit stamp would name the commit the report was *generated* on, which is never the one it ships in.',
  );
  out.push('');

  // --- polar comparison ----------------------------------------------------
  out.push('## Polar: ORC Speed Guide vs model');
  out.push('');

  const gated: Comparison[] = [];
  if (!polar) {
    out.push('> Reference polar not present (`data/polar/orc-j70.json`). Section skipped.');
    out.push('');
  } else {
    out.push(
      `Source: ${polar.source.title}, ${polar.source.vppVersion ?? 'unknown VPP'}, issued ${polar.source.issued ?? 'unknown'}.`,
    );
    out.push('');
    out.push(
      'VMG rows are solved with the TWA optimised; 60/90/120° rows are solved at the printed angle. All 25 printed rows are shown, each section labelled FIT or HELD-OUT. The gate is defined on **every row at TWS 8 and 14** — the two wind speeds the fit never saw (ADR 0012, superseding ADR 0007’s split by angle). Rows at a fitted TWS are marked *fit residual* and are not gated: a small residual there says only that the optimiser worked (ADR 0007).',
    );
    out.push('');
    // The gate row set, straight from the function the vitest gate uses, so
    // the shipped report and `pnpm validate` can never disagree (ADR 0012).
    // `vmgRows`/`angleRows` return references into `polar.rows`, so identity
    // membership is enough.
    const gateSet = new Set(gateRows(polar));
    for (const tws of polar.twsKt) {
      const heldOut = HELD_OUT_TWS.includes(tws);
      progress(`polar: TWS ${tws} kt`);
      out.push(`### TWS ${tws} kt — ${heldOut ? 'HELD-OUT' : 'FIT'}`);
      out.push('');
      out.push(...TABLE_HEAD);
      for (const row of [...vmgRows(polar, tws), ...angleRows(polar, tws)]) {
        const c = compareRow(row);
        const isGated = gateSet.has(row);
        out.push(comparisonRow(c, isGated));
        if (isGated) gated.push(c);
      }
      out.push('');
    }
  }

  // --- gate ----------------------------------------------------------------
  out.push('## Gate (ADR 0007 + 0023 tolerances, ADR 0012 split)');
  out.push('');
  out.push(
    `Row set, frozen by ADR 0012: every row at the held-out wind speeds ${HELD_OUT_TWS.join(' and ')} kt. Tolerances: VMG rows within **${pct(TOL_VMG_BS_FRAC)}** boat speed at the model's own best angle (ADR 0007), and, solved a second time **at the polar's printed angle**, within **${pct(TOL_VMG_SHORTFALL_FRAC)}** of the VMG the model makes at that best angle (ADR 0023); 60/90/120° rows within **${pct(TOL_ANGLE_BS_FRAC)}** boat speed (tier B, ADR 0007). This is the same row set \`validation/polar.test.ts\` gates on.`,
  );
  out.push('');
  out.push(
    `ADR 0023 replaced ADR 0007's **2°** on the VMG angle with that shortfall column. Where the VMG curve is flat, the distance between two argmaxes measures the flatness rather than the model, and neither side's optimiser is precise there: the J/70 polar's own printed running angle travels 162.5° → 172.0° → 174.0° across TWS 12, 14 and 16 while the VMG behind it climbs smoothly. The angle difference is still printed above, as information; what is gated is whether the polar's angle costs the model any real VMG.`,
  );
  out.push('');
  if (gated.length === 0) {
    out.push('**SKIPPED** — no reference polar to gate against.');
  } else {
    const failed = gated.filter((c) => !c.pass);
    const worstBs = gated.reduce((a, c) => (c.bsErrFrac > a.bsErrFrac ? c : a));
    const withTwa = gated.filter((c) => c.twaErrDeg !== null);
    const worstTwa = withTwa.length
      ? withTwa.reduce((a, c) => ((c.twaErrDeg ?? 0) > (a.twaErrDeg ?? 0) ? c : a))
      : null;
    out.push(
      `**${failed.length === 0 ? 'PASS' : 'FAIL'}** — ${gated.length - failed.length}/${gated.length} gated rows inside tolerance.`,
    );
    out.push('');
    out.push(
      `- Worst boat-speed residual: **${pct(worstBs.bsErrFrac)}** at ${worstBs.label} (limit ${pct(worstBs.limitBsFrac)}).`,
    );
    const withShort = gated.filter((c) => c.vmgShortfallFrac !== null);
    if (withShort.length) {
      const worstShort = withShort.reduce((a, c) =>
        (c.vmgShortfallFrac ?? 0) > (a.vmgShortfallFrac ?? 0) ? c : a,
      );
      out.push(
        `- Worst VMG shortfall at the polar's angle: **${shortPct(worstShort.vmgShortfallFrac ?? 0)}** at ${worstShort.label} (limit ${pct(TOL_VMG_SHORTFALL_FRAC)}).`,
      );
    }
    if (worstTwa)
      out.push(
        `- Worst VMG-angle difference (not gated, ADR 0023): **${(worstTwa.twaErrDeg ?? 0).toFixed(1)}°** at ${worstTwa.label}.`,
      );
    if (failed.length) {
      out.push('');
      out.push('Rows outside tolerance:');
      out.push('');
      for (const c of failed)
        out.push(
          `- ${c.label}: boat speed ${pct(c.bsErrFrac)}${c.vmgShortfallFrac === null ? '' : `, VMG shortfall ${shortPct(c.vmgShortfallFrac)}`}${c.converged ? '' : ' (did not converge)'}`,
        );
    }
  }
  out.push('');

  // --- model optimum vs the tuning guide -----------------------------------
  out.push(`## Model optimum vs ${GUIDE ? `${GUIDE.id} base settings` : 'a tuning guide'}`);
  out.push('');
  const grid = candidateGrid();
  if (!GUIDE) {
    out.push(
      `**No tuning guide is committed for \`${boat.id}\`** (\`data/tuning/*-${boat.id}.json\` is empty). There is nothing to compare the model's own dock optimum against, and another class's guide would describe a different rig, so this section is skipped rather than filled. Stage 4 of the calibration — the six rig and shape knobs — was skipped for the same reason and they hold their code defaults, which \`ASSUMPTIONS.md\` records as unfitted. The app's disagreement panel shows the same empty state for this class.`,
    );
    out.push('');
  } else {
    out.push(
      `For each ${GUIDE.id} tuning-guide band, the dock setup the model picks at the band midpoint (best over \`candidateGrid()\`, ${grid.length} legal setups, scored on windward-leeward lap time) against the setting the guide publishes. Stage-4 rig calibration targets the 8–10 and 12–16 kt bands only; every other band is a genuine disagreement (ADR 0007), and the panel shows both sides rather than resolving it.`,
    );
    out.push('');
    out.push(
      '| band | TWS | guide uppers | guide lowers | model uppers | model lowers | model forestay | |',
    );
    out.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');
    guideTable(out, grid);
  }

  // --- weaknesses ----------------------------------------------------------
  out.push('## Honest weaknesses');
  out.push('');
  for (const w of weaknesses()) out.push(`- ${w}`);
  out.push('');

  writeFileSync(OUT, out.join('\n'));
  progress(`wrote ${OUT} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

function guideTable(out: string[], grid: DockControls[]): void {
  for (const band of GUIDE?.bands ?? []) {
    const tws = bandMidpoint(band);
    progress(`dock optimum: ${band.label} (TWS ${tws} kt, ${grid.length} setups)`);
    const forecast: Forecast = {
      minKt: tws,
      likelyKt: tws,
      maxKt: tws,
      seaState: POLAR_SEA_STATE,
      crewKg: POLAR_CREW_KG,
    };
    let best: DockControls = grid[0];
    let bestT = Infinity;
    for (const setup of grid) {
      const t = lapTimeHours(boat, setup, forecast, tws, GEOM);
      if (t < bestT) {
        bestT = t;
        best = setup;
      }
    }
    // 8-10 and 12-16 are the bands stage-4 calibration is fitted on.
    const calibrated = tws === 9 || tws === 14 ? ' calibrated here' : '';
    out.push(
      `| ${band.label} | ${tws} | ${band.uppersTurns} | ${band.lowersTurns} | ${best.upperTurns} | ${best.lowerTurns} | ${best.forestayMm} mm |${calibrated} |`,
    );
  }
  out.push('');
  out.push(
    'Guide turns are relative to the guide base (Loos PT-2 22 uppers / 12 lowers); model turns are on the same scale. A row where the two disagree is information, not a bug: the guide optimises for a fleet and a sail inventory, the model for lap time under this hydro fit.',
  );
  out.push('');
}

main();

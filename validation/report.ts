/**
 * Writes `validation/report.md`: the polar comparison, the hold-out gate
 * verdict (ADR 0007 tolerances over ADR 0012's split), the model's own best
 * dock setup against the North tuning guide, and a plain list of what this
 * model is bad at.
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
  TOL_VMG_TWA_DEG,
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
  '**Heel is tier B, and since ADR 0022 nothing fits it.** The righting model is anchored on one published number (`rmMeasuredKgMPerDeg`, 18.5 kg·m/deg) and an assumed 25° knee; crew hiking is a linear ramp with an assumed 8° reference. `hydro.crewArmMul` used to be fitted against the heel column below and no longer is: once heel started costing real drag, a knob fitted on an ungated tier-B column was setting gated boat speed, and fitted freely it ran to a bound in both directions. It now holds its defined value — the hardest crew CG the class hiking rule allows, which is the condition these rows are replayed under. So the model reads 6–14° less heel than the 2011 polar prints from TWS 10 up, and that is shown as a disagreement rather than absorbed. Two published sources (ORC’s pre-2013 effective-draft chart, and the Delft effective-draft polynomial) agree that the plain `cos(heel)` on the keel span in `hydro/keel.ts` is too weak — nearer cos^1.2 to cos^2.9 — which is the next candidate mechanism and was deliberately left out of ADR 0022 so one heel mechanism at a time stays attributable.',
  '**The asymmetric is tier C for anything but speed.** The ORC offwind coefficient set is applied on centreline with no tack-line, sprit or rotation model, so asymmetric heel and leeway are direction-only. The guide’s own downwind advice (ease the tack 4–6 in before planing) has no representation in the physics.',
  '**The offwind sail’s deep-angle drag is a fitted number, not a measurement (ADR 0018).** Above AWA 115° the ORC CD0 is multiplied by `aero.asymCdMul`, ramped to full at 150°. Without it the model made 264 N of drive at TWS 14 / TWA 172° where 351 N is needed, and never soaked at any wind speed below 16 kt. The fitted 2.377 lands inside the published wind-tunnel band once the reference-area conventions are reconciled, but it is standing in for a mechanism the model does not contain — ORC gives the spinnaker no blanketing term, so the main’s shadow on the kite is absent and the sprit and tack line act on nothing.',
  '**The one gated row still failing fails only on angle.** Held-out TWS 14 asymmetric: boat speed 2.1 %, inside the 3 % tolerance, at a VMG angle 3.3° against a 2° one. That angle is a plateau, not a peak in the wrong place — VMG there is flat to 0.11 % over 168–172°, so 3.3° is worth almost nothing and no number moves it reliably. Sailed at the polar’s own 172° the model does 6.32 kt against 6.26, 1.0 % fast: the boat is right, the argmax on a flat curve is not. The model’s optimum is compressed into 168–169° from 14 kt up against the polar’s 141.9° → 174.0° over TWS 6–16. This needs a second mechanism, not a better number.',
  '**Downwind VMG is bimodal.** There is a reaching hump near 145° and a soak hump near 168° with a trough between them, and the two cross between TWS 10 and 12. `optimal()` scans before it refines, which usually picks the global hump — but not at the crossing itself: the fitted TWS 12 row lands on the reaching one at 151.3° against a printed 162.5° and reads 8.6 % fast, the only row in the whole polar outside 3.4 %. Near the crossing the dock-setup ranking is genuinely jumpy too — about 0.19 s/mile, a tenth of the tie band the UI refuses to resolve inside.',
  '**The upwind speed plateau is closed, and the way it closed is a warning about reading a fit.** For two rounds this bullet said the plateau was a model limit that no knob could close, citing `hydro.heelDragK` fitted to 0.919 well inside a bound of 4.0. The knob was not declining headroom, it was anchored wrong: the old assumed form scaled heel drag on *viscous* resistance, burying a friction coefficient of ~0.0029 inside the knob, so even at 4.0 it topped out at about half the penalty the plateau needs. And the stage-1 heel weight, documented as keeping heel "the weakest term", measured at 62 % of the loss — heel drag slows the boat, a slower boat heels less, so the fit was paid to keep the mechanism at zero. ADR 0022 replaced the form with the published Delft heel law normalised at 20°, dropped the heel weight to 0.002 and stopped fitting the crew arm. Every printed jib row is now within 3.4 % on boat speed, held-out and fitted alike.',
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
const progress = (msg: string) => process.stderr.write(`${msg}\n`);

/**
 * One table row. `gated` is membership of `gateRows()` — every row at a
 * held-out TWS (ADR 0012). Rows at a fitted TWS are shown for completeness
 * but carry no verdict: a fit residual says only that the optimiser worked
 * (ADR 0007), so the tolerance column is blank and the last column says so.
 */
function comparisonRow(c: Comparison, gated: boolean): string {
  const twa = c.twaErrDeg === null ? '—' : `${c.twaErrDeg.toFixed(1)}°`;
  const label = c.kind === 'angle' ? `${c.polar.twaDeg}° ${c.sail}` : `${c.kind} ${c.sail}`;
  const limit = !gated
    ? '—'
    : c.limitTwaDeg === null
      ? `${pct(c.limitBsFrac)}`
      : `${pct(c.limitBsFrac)} / 2°`;
  const verdict = !gated ? 'fit residual' : c.pass ? 'ok' : '**FAIL**';
  return `| ${label} | ${c.polar.bsKt.toFixed(2)} | ${c.model.bsKt.toFixed(2)} | ${pct(c.bsErrFrac)} | ${c.polar.twaDeg.toFixed(1)} | ${c.model.twaDeg.toFixed(1)} | ${twa} | ${c.polar.heelDeg === null ? '—' : c.polar.heelDeg.toFixed(1)} | ${c.model.heelDeg.toFixed(1)} | ${limit} | ${verdict} |`;
}

const TABLE_HEAD = [
  '| row | polar bs | model bs | bs err | polar twa | model twa | twa err | polar heel | model heel | limit | |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |',
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
  out.push('## Gate (ADR 0007 tolerances, ADR 0012 split)');
  out.push('');
  out.push(
    `Row set, frozen by ADR 0012: every row at the held-out wind speeds ${HELD_OUT_TWS.join(' and ')} kt. Tolerances, frozen by ADR 0007: VMG rows within **${pct(TOL_VMG_BS_FRAC)}** boat speed and **${TOL_VMG_TWA_DEG}°** VMG angle; 60/90/120° rows within **${pct(TOL_ANGLE_BS_FRAC)}** boat speed (tier B). This is the same row set \`validation/polar.test.ts\` gates on.`,
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
    if (worstTwa)
      out.push(
        `- Worst VMG-angle residual: **${(worstTwa.twaErrDeg ?? 0).toFixed(1)}°** at ${worstTwa.label} (limit ${TOL_VMG_TWA_DEG}°).`,
      );
    if (failed.length) {
      out.push('');
      out.push('Rows outside tolerance:');
      out.push('');
      for (const c of failed)
        out.push(
          `- ${c.label}: boat speed ${pct(c.bsErrFrac)}${c.twaErrDeg === null ? '' : `, angle ${c.twaErrDeg.toFixed(1)}°`}${c.converged ? '' : ' (did not converge)'}`,
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

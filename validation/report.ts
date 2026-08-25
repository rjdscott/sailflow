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
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import north from '../data/tuning/north-j70.json';
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

const OUT = fileURLToPath(new URL('./report.md', import.meta.url));
const GEOM = geometryFor(boat);

/**
 * What this model is bad at. Kept here as prose rather than derived, because
 * these are judgements about the model, not measurements of it (ADR 0006).
 */
const WEAKNESSES = [
  '**Heel is tier B, everywhere.** The righting model is anchored on one published number (`rmMeasuredKgMPerDeg`, 18.5 kg·m/deg) and an assumed 25° knee; crew hiking is a linear ramp with an assumed 8° reference. Heel angles are directionally right and quantitatively a band, not a number.',
  '**The asymmetric is tier C for anything but speed.** The ORC offwind coefficient set is applied on centreline with no tack-line, sprit or rotation model, so asymmetric heel and leeway are direction-only. The guide’s own downwind advice (ease the tack 4–6 in before planing) has no representation in the physics.',
  '**The whole shape layer is invented.** `rig/state.ts`, `shape/flying.ts` and `shape/toOrc.ts` are sign-correct heuristics with calibration knobs (ADR 0006). No published J/70 data maps turnbuckle turns to shroud tension, tension to forestay sag, or sag to flying shape. Every magnitude in that chain is an assumption; only the signs are tested.',
  '**The 20 kt asymmetric row is a planing row and this is a displacement model.** The ORC polar prints 11.53 kt at TWA 137° in 20 kt, which is the hull up and planing. The residuary curve here has a `hydro.planingRelief` knob whose fallback is zero, so the model has no planing regime to fit. Treat the 20 kt downwind numbers as out of range, not as a validated answer.',
  '**The source polar is VPP 2011 1.02 and the coefficients implemented are the 2023 edition.** Part of every residual below is ORC’s own revisions between the two, not model error (ADR 0007).',
];

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
  return `| ${label} | ${c.polar.bsKt.toFixed(2)} | ${c.model.bsKt.toFixed(2)} | ${pct(c.bsErrFrac)} | ${c.polar.twaDeg.toFixed(1)} | ${c.model.twaDeg.toFixed(1)} | ${twa} | ${c.polar.heelDeg.toFixed(1)} | ${c.model.heelDeg.toFixed(1)} | ${limit} | ${verdict} |`;
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

  // --- model optimum vs the North guide ------------------------------------
  out.push('## Model optimum vs North base settings');
  out.push('');
  const grid = candidateGrid();
  out.push(
    `For each North tuning-guide band, the dock setup the model picks at the band midpoint (best over \`candidateGrid()\`, ${grid.length} legal setups, scored on windward-leeward lap time) against the setting the guide publishes. Stage-4 rig calibration targets the 8–10 and 12–16 kt bands only; every other band is a genuine disagreement (ADR 0007), and the panel shows both sides rather than resolving it.`,
  );
  out.push('');
  out.push(
    '| band | TWS | guide uppers | guide lowers | model uppers | model lowers | model forestay | |',
  );
  out.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |');

  for (const band of north.bands) {
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

  // --- weaknesses ----------------------------------------------------------
  out.push('## Honest weaknesses');
  out.push('');
  for (const w of WEAKNESSES) out.push(`- ${w}`);
  out.push('');

  writeFileSync(OUT, out.join('\n'));
  progress(`wrote ${OUT} in ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

main();

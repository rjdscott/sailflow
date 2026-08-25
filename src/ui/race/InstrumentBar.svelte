<script lang="ts">
  import type { SolveResult } from '../../core/types';
  import { fmt, targetOf } from '../format';
  import InstrumentCell from '../components/InstrumentCell.svelte';
  import BulletGauge from '../components/BulletGauge.svelte';
  import Sheet from '../components/Sheet.svelte';
  import { READOUT_EXPLAIN } from '../explain';
  import { heelBands, HEEL_SCALE_MAX, HELM_TARGET } from '../instruments/gauges';
  import type { History } from '../instruments/history';
  import type { Objective } from './store.svelte';
  import { verdict } from './verdict';

  /**
   * The cockpit's instrument band (ADR 0015, research §4 patterns 2-3):
   * measurements across the top, the two gauges that only mean anything
   * together underneath, and one sentence of verdict along the bottom.
   *
   * Every number goes through the one instrument-cell contract, and the
   * density tier is a `data-tier` attribute on the root, not three component
   * trees — learn drops TWA and the helm bar and leads with the verdict,
   * analyse adds the two leech readings.
   */
  let {
    result,
    twaDeg,
    objective,
    busy = false,
    target,
    history,
    twsKt,
    coach,
  }: {
    result: SolveResult;
    twaDeg: number;
    /** What "faster" means here; downwind VMG is negative towards the mark. */
    objective: Objective;
    busy?: boolean;
    /** What the solver's optimal trim reaches at this condition, if it has answered. */
    target?: { bsKt?: number; vmgKt?: number; heelDeg?: number };
    /** Recent converged solves at this condition, for the trend lines. */
    history: History;
    twsKt: number;
    /** The coach line's probe sentence, the verdict's fallback cue. */
    coach?: string;
  } = $props();

  /** One convention everywhere: + means the target is faster than you (ux-02 M-09). */
  const vmgBetter = $derived(objective === 'vmgDown' ? ('less' as const) : ('more' as const));
  const gapTo = (
    value: number,
    to: number | undefined,
    decimals: number,
    better: 'more' | 'less' = 'more',
  ) => {
    const t = targetOf(value, to, decimals, better);
    return t && { ...t, label: 'to optimum' };
  };

  /**
   * `History` is a plain buffer, not a rune, so nothing here would re-read it
   * on its own. It can only have grown when a new `result` arrived, which is
   * exactly the dependency this re-reads it on.
   */
  const trend = $derived.by(() => {
    void result;
    return { bs: history.series('bs'), vmg: history.series('vmg') };
  });

  const heel = $derived(heelBands(twsKt));
  const line = $derived(verdict({ result, target, objective, coach }));

  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);

  const TITLES: Record<string, string> = {
    bsp: 'BSP',
    pctPolar: '% polar',
    vmg: 'VMG',
    height: 'TWA',
    heel: 'Heel',
    helm: 'Helm load',
    leechStall: 'Main leech stall',
    jibStripe: 'Jib leech stripe',
  };

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }

  /**
   * Phone only: the band keeps BSP · %POLAR · VMG · HEEL and puts the rest
   * behind this. Four cells and a gauge are what fits above the fold on a
   * 390 px screen; the others are a tap away rather than a scroll away.
   * The extras are hidden by CSS at this width only, so every other width
   * has the whole band and this button is not there at all.
   */
  let more = $state(false);
</script>

<section class="card bar" class:more class:stale={!result.converged} aria-live="off">
  {#if busy}<span class="progress" aria-hidden="true"></span>{/if}

  <div class="cells">
    <InstrumentCell
      label="BSP"
      id="bsp"
      size="lg"
      unit="kt"
      value={fmt(result.bsKt.value, 1)}
      tier={result.bsKt.tier}
      target={gapTo(result.bsKt.value, target?.bsKt, 1)}
      trend={trend.bs}
      onexplain={explain}
    />
    <InstrumentCell
      label="%POLAR"
      id="pctPolar"
      size="lg"
      unit="%"
      value={fmt(result.instruments.pctPolar.value, 0)}
      tier={result.instruments.pctPolar.tier}
      onexplain={explain}
    />
    <InstrumentCell
      label="VMG"
      id="vmg"
      size="lg"
      unit="kt"
      value={fmt(result.vmgKt.value, 2)}
      tier={result.vmgKt.tier}
      target={gapTo(result.vmgKt.value, target?.vmgKt, 2, vmgBetter)}
      trend={trend.vmg}
      onexplain={explain}
    />
    <div class="race-only phone-extra">
      <InstrumentCell
        label="TWA"
        id="height"
        size="md"
        unit="°"
        value={fmt(twaDeg, 0)}
        onexplain={explain}
      />
    </div>

    <button type="button" class="more-btn" aria-expanded={more} onclick={() => (more = !more)}>
      {more ? 'Less' : 'More'}
    </button>
  </div>

  <!-- Side by side on purpose: the Speed Guide's point is that helm feel only
       tells the truth while heel is steady, so a helm bar without a heel gauge
       beside it is a cue that lies (research §2.3). -->
  <div class="gauges">
    <BulletGauge
      label="HEEL"
      id="heel"
      unit="°"
      value={Math.abs(result.heelDeg.value)}
      min={0}
      max={HEEL_SCALE_MAX}
      target={heel.target}
      ranges={[heel.lo, heel.hi]}
      tier={result.heelDeg.tier}
      onexplain={explain}
    />
    <div class="race-only phone-extra">
      <BulletGauge
        label="HELM"
        id="helm"
        value={result.instruments.helmLoad.value}
        min={-1.5}
        max={1.5}
        target={HELM_TARGET}
        decimals={2}
        symbol
        tier={result.instruments.helmLoad.tier}
        onexplain={explain}
      />
    </div>
  </div>

  <div class="cells analyse-only phone-extra">
    <InstrumentCell
      label="LEECH STALL"
      id="leechStall"
      size="sm"
      unit="%"
      value={fmt(result.instruments.leechStallFrac.value * 100, 0)}
      tier={result.instruments.leechStallFrac.tier}
      onexplain={explain}
    />
    {#if result.instruments.jibLeechStripe}
      <InstrumentCell
        label="JIB STRIPE"
        id="jibStripe"
        size="sm"
        value={fmt(result.instruments.jibLeechStripe.value, 1)}
        tier={result.instruments.jibLeechStripe.tier}
        onexplain={explain}
      />
    {/if}
  </div>

  <p class="verdict">{line}</p>

  <Sheet bind:open={sheetOpen} title={explaining ? (TITLES[explaining] ?? '') : ''}>
    <p class="explainer">{explaining ? READOUT_EXPLAIN[explaining] : ''}</p>
  </Sheet>
</section>

<style>
  .bar {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .cells {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    gap: var(--space-3) var(--space-4);
  }

  .gauges {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: var(--space-3) var(--space-4);
    padding-top: var(--space-3);
    border-top: 1px solid var(--line);
  }

  /* Phone: BSP · %POLAR · VMG · HEEL, and the rest behind the button. The
     collapsed rule is scoped to this width, so no other layout can lose a
     reading to it. */
  .more-btn {
    display: none;
    align-self: center;
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-xs);
    cursor: pointer;
  }

  @media (max-width: 719px) {
    .more-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .bar:not(.more) .phone-extra {
      display: none;
    }
  }

  /* Desktop cockpit: the whole band on one line — measurements, the pair of
     gauges, then the verdict — so the instrument row costs ~90 px of a
     720 px screen instead of ~190 (research §4 pattern 2). */
  @media (min-width: 1280px) {
    .bar {
      flex-direction: row;
      align-items: center;
      gap: var(--space-4);
      padding: var(--space-3) var(--space-4);
    }

    /* Flex, not the auto-fit grid: an auto-fit track list inside a flex item
       has no definite width to fit against and collapses to one column —
       which is the instrument band as a tower, 360 px of a 720 px screen. */
    .cells {
      display: flex;
      flex: none;
      align-items: center;
      gap: var(--space-4);
    }

    .gauges {
      display: flex;
      flex: 0 1 340px;
      gap: var(--space-4);
      padding-top: 0;
      padding-left: var(--space-4);
      border-top: none;
      border-left: 1px solid var(--line);
    }

    .gauges > * {
      flex: 1;
      min-width: 0;
    }

    .verdict {
      flex: 1 1 20ch;
      min-width: 0;
      font-size: var(--text-sm);
    }
  }

  .verdict {
    margin: 0;
    font-size: var(--text-md);
    color: var(--ink);
  }

  .explainer {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }

  /* One attribute on the root picks the density (ADR 0015). Learn drops the
     angle you set and the helm bar you cannot feel, and reads the verdict
     first; analyse is the only tier that gets the two leech readings. */
  .analyse-only {
    display: none;
  }

  :global([data-tier='analyse']) .analyse-only {
    display: grid;
  }

  :global([data-tier='learn']) .race-only {
    display: none;
  }

  :global([data-tier='learn']) .verdict {
    order: -1;
    font-size: var(--text-lg);
    font-weight: 600;
  }

  .stale {
    opacity: 0.75;
  }

  /* 1 px indeterminate line, absolutely positioned: a solve in flight never
     moves anything on the page. */
  .progress {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
    background-size: 40% 100%;
    background-repeat: no-repeat;
    animation: sweep 1.1s linear infinite;
  }

  @keyframes sweep {
    from {
      background-position: -40% 0;
    }
    to {
      background-position: 140% 0;
    }
  }
</style>

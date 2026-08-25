<script lang="ts">
  import type { RaceControls, Tier } from '../../../core/types';
  import Slider from '../../components/Slider.svelte';
  import { TRIM_CONTROLS } from '../../../worker/protocol';
  import { BASE_RACE } from '../../stores/conditions.svelte';
  import { optimum } from '../optimum.svelte';
  import { CONTROLS, race, type Chevron } from '../store.svelte';

  /**
   * One control in a cockpit panel: the linked slider + numeric pair, its
   * optimum bug, the base-trim tick, the gradient chevron, and the `?` that
   * opens the panel's explain sheet. The panel owns the sheet, so this stays
   * a row and the copy stays in one place per panel.
   */
  let {
    id,
    values,
    optimumBug = false,
    locked = false,
    lockReason,
    tier,
    onexplain,
  }: {
    id: string;
    /** The store's reactive controls object; the slider binds through it. */
    values: Record<string, number>;
    /** Draw the solver's optimum. Off for controls the shape layer ignores. */
    optimumBug?: boolean;
    locked?: boolean;
    lockReason?: string;
    tier?: Tier;
    onexplain: (id: string) => void;
  } = $props();

  const spec = $derived(CONTROLS[id]);
  const chev: Chevron | undefined = $derived(race.chevrons[id]);
  const trimmed = new Set<string>(TRIM_CONTROLS);

  /** Said once, plainly, instead of drawing a tick nobody can trust. */
  const NO_EFFECT = 'No modelled effect on speed — it changes the drawn shape only.';

  /**
   * The optimum for one race control, or undefined where there is none to
   * draw. `mainHalyard`, `jibHalyard` and `inhauler` move draft position and
   * entry angle, which the shape layer never reads, so the search does not
   * touch them and a tick there would be a fabricated answer key (audit M-09).
   */
  const target = $derived(
    optimumBug && trimmed.has(id) ? optimum.race?.[id as keyof RaceControls] : undefined,
  );

  /** The base trim, marked on the track. Not a tuning-guide number (base.ts). */
  const tick = $derived(id in BASE_RACE ? BASE_RACE[id as keyof RaceControls] : undefined);

  /** ARIA drops a name on a bare span, so the chevron carries a role too. */
  const chevLabel = $derived(
    chev ? `${chev.dir > 0 ? 'Up' : 'Down'} gains ${chev.gainKt.toFixed(2)} kt` : '',
  );
</script>

<div class="row">
  <div class="grow">
    <Slider
      label={spec.label}
      bind:value={values[id]}
      min={spec.min}
      max={spec.max}
      step={spec.step}
      unit={spec.unit}
      decimals={spec.step < 1 ? 1 : 0}
      {tick}
      tickWord="base trim"
      {locked}
      lockReason={lockReason ?? undefined}
      {tier}
      {target}
      targetStale={optimum.stale || optimum.busy}
      highlight={race.hovering?.includes(id) ?? false}
      hint={optimumBug && !trimmed.has(id) ? NO_EFFECT : undefined}
    />
  </div>
  <div class="side">
    {#if chev}
      <!-- Every chevron rendered is a gain, so the colour is one accent for
           both directions; only the glyph says which way, and the title says
           how much (audit ux-01 M-02). Analyse tier only: a gradient on every
           row is a wall of arrows in the tier you are trimming in. -->
      <span class="chev" role="img" title={chevLabel} aria-label={chevLabel}>
        {chev.dir > 0 ? '▲' : '▼'}
      </span>
    {/if}
    <button
      type="button"
      class="info hit-44"
      onclick={() => onexplain(id)}
      aria-label="What {spec.label} does"
    >
      ?
    </button>
  </div>
</div>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .grow {
    flex: 1;
    min-width: 0;
  }

  /* Desktop cockpit: label, value and track on one 36 px line rather than two
     stacked halves. Eight of these have to fit a panel column on a 720 px-tall
     screen, and the label-above-track stack costs 72 px a row for nothing a
     mouse needs (research §3 principle 25 — one spacing module, integer px).
     It reaches into `Slider`'s own markup on purpose: the compaction is this
     screen's, not the component's, and Dock and Log keep the tall rows. */
  @media (min-width: 1280px) {
    .grow :global(.slider-row) {
      display: grid;
      grid-template-columns: minmax(96px, 1.2fr) minmax(104px, 1fr);
      align-items: center;
      column-gap: var(--space-2);
      padding-block: 0;
    }

    /* One line for the name, whatever its length: the parenthetical half of
       "Traveller (+ up to windward)" is in the range's accessible name and in
       the `?` sheet, and wrapping it here would cost the row its 36 px. */
    .grow :global(.slider-row .label) {
      display: block;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      font-size: var(--text-xs);
    }

    .grow :global(.slider-row > .lock-note),
    .grow :global(.slider-row > .hint) {
      grid-column: 1 / -1;
    }

    .grow :global(.track-wrap),
    .grow :global(.range),
    .grow :global(.step) {
      height: 36px;
    }

    .grow :global(.step) {
      width: 28px;
    }

    .info {
      width: 28px;
      height: 28px;
    }
  }

  .side {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  /* 36 px glyph, 44 px target: the ? never crowds the slider it belongs to. */
  .info {
    flex: none;
    width: 36px;
    height: 36px;
    border: 1px solid var(--line-strong);
    border-radius: 50%;
    background: var(--bg);
    color: var(--ink-2);
    font-size: var(--text-sm);
    line-height: 1;
    cursor: pointer;
  }

  .chev {
    display: none;
    color: var(--accent);
    font-size: var(--text-xs);
  }

  :global([data-tier='analyse']) .chev {
    display: inline;
  }
</style>

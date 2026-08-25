<script lang="ts">
  import type { RaceControls } from '../../core/types';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import LockIcon from '../components/LockIcon.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Slider from '../components/Slider.svelte';
  import { TRIM_CONTROLS } from '../../worker/protocol';
  import { optimum } from './optimum.svelte';
  import { EXPLAIN } from '../explain';
  import { conditions } from '../stores/conditions.svelte';
  import { settings } from '../stores/settings.svelte';
  import { rigLock } from '../stores/rigLock.svelte';
  import { CONTROLS, race, type Chevron } from './store.svelte';

  // Plain aliases onto the store's reactive proxies: the sliders bind through
  // them, so the store must mutate these objects rather than replace them.
  const raceValues = race.controls.race as unknown as Record<string, number>;
  const downValues = (race.controls.down ?? {}) as unknown as Record<string, number>;
  const dockValues = race.controls.dock as unknown as Record<string, number>;

  const GROUPS: { name: string; ids: string[] }[] = [
    { name: 'Sheets', ids: ['mainsheet', 'jibSheet', 'traveller', 'jibLead', 'inhauler'] },
    { name: 'Rig', ids: ['backstay', 'vang', 'cunningham', 'outhaul'] },
    { name: 'Halyards', ids: ['mainHalyard', 'jibHalyard'] },
  ];

  const DOWN_IDS = ['kiteHalyard', 'tackLine', 'kiteSheet', 'sprit'];
  const DOCK_IDS = ['upperTurns', 'lowerTurns', 'forestayMm'];

  /** Simple mode: the five gears you actually move on a beat. */
  const SIMPLE = ['mainsheet', 'traveller', 'backstay', 'jibSheet', 'jibLead'];

  const advanced = $derived(settings.advanced);
  /** Kite hoisted: the kite rows show in both modes, checkbox or not (ux-01 M-22). */
  const kiteUp = $derived(conditions.sailset === 'asym');
  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }

  function decimals(step: number): number {
    return step < 1 ? 1 : 0;
  }

  function visible(ids: string[]): string[] {
    return advanced ? ids : ids.filter((id) => SIMPLE.includes(id));
  }

  const trimmed = new Set<string>(TRIM_CONTROLS);

  /**
   * The optimum for one race control, or undefined where there is none to
   * draw. `mainHalyard`, `jibHalyard` and `inhauler` move draft position and
   * entry angle, which the shape layer never reads, so the search does not
   * touch them and a tick there would be a fabricated answer key (audit M-09).
   */
  function targetFor(id: string): number | undefined {
    if (!trimmed.has(id)) return undefined;
    return optimum.race?.[id as keyof RaceControls];
  }

  /** ARIA drops a name on a bare span, so the chevron carries a role too. */
  function chevLabel(chev: Chevron): string {
    return `${chev.dir > 0 ? 'Up' : 'Down'} gains ${chev.gainKt.toFixed(2)} kt`;
  }

  /** Said once, plainly, instead of drawing a tick nobody can trust. */
  const NO_EFFECT = 'No modelled effect on speed — it changes the drawn shape only.';
</script>

{#snippet row(
  id: string,
  values: Record<string, number>,
  opts: { locked?: boolean; tier?: 'C'; chevron?: boolean; optimum?: boolean } = {},
)}
  {@const spec = CONTROLS[id]}
  {@const chev = race.chevrons[id]}
  <div class="row">
    <div class="grow">
      <Slider
        label={spec.label}
        bind:value={values[id]}
        min={spec.min}
        max={spec.max}
        step={spec.step}
        unit={spec.unit}
        decimals={decimals(spec.step)}
        locked={opts.locked}
        tier={opts.tier}
        target={opts.optimum ? targetFor(id) : undefined}
        targetStale={optimum.stale || optimum.busy}
        hint={opts.optimum && !trimmed.has(id) ? NO_EFFECT : undefined}
      />
    </div>
    <div class="side">
      {#if opts.chevron && chev}
        <!-- Every chevron rendered is a gain, so the colour is one accent for
             both directions; only the glyph says which way, and the title says
             how much (audit ux-01 M-02). -->
        <span class="chev" role="img" title={chevLabel(chev)} aria-label={chevLabel(chev)}>
          {chev.dir > 0 ? '▲' : '▼'}
        </span>
      {/if}
      <button
        type="button"
        class="info hit-44"
        onclick={() => explain(id)}
        aria-label="What {spec.label} does"
      >
        ?
      </button>
    </div>
  </div>
{/snippet}

<div class="stack">
  {#each GROUPS as group (group.name)}
    {@const ids = visible(group.ids)}
    {#if ids.length}
      <section class="card">
        <h2 class="section-title">{group.name}</h2>
        {#each ids as id (id)}
          {@render row(id, raceValues, { chevron: advanced, optimum: true })}
        {/each}
      </section>
    {/if}
  {/each}

  {#if advanced || kiteUp}
    <section class="card">
      <h2 class="section-title">
        Downwind
        {#if advanced && !kiteUp}
          <label class="dw">
            <input type="checkbox" bind:checked={race.downwind} />
            show kite controls
          </label>
        {/if}
      </h2>
      {#if race.downwind || kiteUp}
        <p class="banner"><ConfidenceBadge tier="C" /> Downwind is direction only.</p>
        {#each DOWN_IDS as id (id)}
          {@render row(id, downValues, { tier: 'C' })}
        {/each}
      {/if}
    </section>
  {/if}

  <section class="card">
    <h2 class="section-title">
      Dock setup
      {#if rigLock.lockedToday}
        <span class="locked-note"><LockIcon /> committed for the day</span>
      {:else}
        <span class="locked-note">not committed, free to explore</span>
      {/if}
    </h2>
    {#each DOCK_IDS as id (id)}
      {@render row(id, dockValues, { locked: rigLock.lockedToday })}
    {/each}
  </section>
</div>

<Sheet bind:open={sheetOpen} title={explaining ? CONTROLS[explaining].label : ''}>
  <p class="explainer">{explaining ? EXPLAIN[explaining] : ''}</p>
</Sheet>

<style>
  .row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .row + .row {
    border-top: 1px solid var(--line);
  }

  .grow {
    flex: 1;
    min-width: 0;
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
    color: var(--accent);
    font-size: var(--text-xs);
  }

  .banner {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: var(--space-2) 0 0;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    color: var(--ink-2);
    font-size: var(--text-xs);
  }

  .dw {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
    margin-left: auto;
    text-transform: none;
    letter-spacing: normal;
  }

  .locked-note {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    margin-left: auto;
    font-size: var(--text-xs);
    text-transform: none;
    letter-spacing: normal;
  }

  .explainer {
    margin: 0;
    font-size: var(--text-md);
    line-height: 1.55;
    color: var(--ink);
  }
</style>

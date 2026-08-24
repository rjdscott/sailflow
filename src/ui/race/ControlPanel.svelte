<script lang="ts">
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Slider from '../components/Slider.svelte';
  import { EXPLAIN } from '../explain';
  import { settings } from '../stores/settings.svelte';
  import { CONTROLS, race } from './store.svelte';

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

  const advanced = $derived(settings.mode === 'advanced');
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
</script>

{#snippet row(
  id: string,
  values: Record<string, number>,
  opts: { locked?: boolean; tier?: 'C'; chevron?: boolean } = {},
)}
  {@const spec = CONTROLS[id]}
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
      />
    </div>
    <div class="side">
      {#if opts.chevron && race.chevrons[id]}
        <span
          class="chev"
          class:up={race.chevrons[id] > 0}
          aria-label="gain from moving this control"
        >
          {race.chevrons[id] > 0 ? '▲' : '▼'}
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
          {@render row(id, raceValues, { chevron: advanced })}
        {/each}
      </section>
    {/if}
  {/each}

  {#if advanced}
    <section class="card">
      <h2 class="section-title">
        Downwind
        <label class="dw">
          <input type="checkbox" bind:checked={race.downwind} />
          show kite controls
        </label>
      </h2>
      {#if race.downwind}
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
      <span class="locked-note">🔒 committed for the day</span>
    </h2>
    {#each DOCK_IDS as id (id)}
      {@render row(id, dockValues, { locked: true })}
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
    border: 1px solid var(--line);
    border-radius: 50%;
    background: var(--bg);
    color: var(--ink-2);
    font-size: var(--text-sm);
    line-height: 1;
    cursor: pointer;
  }

  .chev {
    color: var(--bad);
    font-size: var(--text-xs);
  }

  .chev.up {
    color: var(--good);
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

<script lang="ts">
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Slider from '../components/Slider.svelte';
  import { EXPLAIN } from '../explain';
  import { settings } from '../stores/settings.svelte';
  import { PRESETS } from '../stores/conditions.svelte';
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

{#snippet head(id: string, chevron = false)}
  <div class="side">
    {#if chevron && race.chevrons[id]}
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
      class="info"
      onclick={() => explain(id)}
      aria-label="What {CONTROLS[id].label} does"
    >
      ?
    </button>
  </div>
{/snippet}

<section class="panel">
  {#if !advanced}
    <div class="presets">
      {#each PRESETS as p (p.id)}
        <button type="button" onclick={() => race.applyPreset(p)}>{p.label}</button>
      {/each}
    </div>
  {/if}

  {#each GROUPS as group (group.name)}
    {@const ids = visible(group.ids)}
    {#if ids.length}
      <h3>{group.name}</h3>
      {#each ids as id (id)}
        {@const spec = CONTROLS[id]}
        <div class="row">
          <div class="grow">
            <Slider
              label={spec.label}
              bind:value={raceValues[id]}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              unit={spec.unit}
              decimals={decimals(spec.step)}
            />
          </div>
          {@render head(id, advanced)}
        </div>
      {/each}
    {/if}
  {/each}

  {#if advanced}
    <h3>
      Downwind
      <label class="dw">
        <input type="checkbox" bind:checked={race.downwind} />
        show kite controls
      </label>
    </h3>
    {#if race.downwind}
      <p class="banner"><ConfidenceBadge tier="C" /> downwind: direction only</p>
      {#each ['kiteHalyard', 'tackLine', 'kiteSheet', 'sprit'] as id (id)}
        {@const spec = CONTROLS[id]}
        <div class="row">
          <div class="grow">
            <Slider
              label={spec.label}
              bind:value={downValues[id]}
              min={spec.min}
              max={spec.max}
              step={spec.step}
              unit={spec.unit}
              decimals={decimals(spec.step)}
              tier="C"
            />
          </div>
          {@render head(id)}
        </div>
      {/each}
    {/if}
  {/if}

  <h3>Dock setup <span class="locked-note">🔒 committed for the day</span></h3>
  {#each ['upperTurns', 'lowerTurns', 'forestayMm'] as id (id)}
    {@const spec = CONTROLS[id]}
    <div class="row">
      <div class="grow">
        <Slider
          label={spec.label}
          value={dockValues[id]}
          min={spec.min}
          max={spec.max}
          step={spec.step}
          unit={spec.unit}
          decimals={decimals(spec.step)}
          locked
        />
      </div>
      {@render head(id)}
    </div>
  {/each}
</section>

<Sheet bind:open={sheetOpen} title={explaining ? CONTROLS[explaining].label : ''}>
  <p class="explainer">{explaining ? EXPLAIN[explaining] : ''}</p>
</Sheet>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    padding-bottom: var(--space-8);
  }

  h3 {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin: var(--space-4) 0 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .grow {
    flex: 1;
    min-width: 0;
  }

  .side {
    display: flex;
    align-items: center;
    gap: var(--space-1);
  }

  .info {
    min-width: var(--hit-min);
    min-height: var(--hit-min);
    border: 1px solid var(--ink-2);
    border-radius: 50%;
    width: var(--hit-min);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-md);
    cursor: pointer;
  }

  .chev {
    color: var(--bad);
    font-size: var(--text-sm);
  }

  .chev.up {
    color: var(--good);
  }

  .presets {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    padding-block: var(--space-2);
  }

  .presets button {
    flex: 1;
    min-height: var(--hit-min);
    border: 1px solid var(--accent);
    border-radius: var(--radius);
    background: transparent;
    color: var(--accent);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .banner {
    margin: var(--space-2) 0 0;
    padding: var(--space-2);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink-2);
    font-size: var(--text-xs);
  }

  .dw {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
    text-transform: none;
    letter-spacing: normal;
  }

  .locked-note {
    font-size: var(--text-xs);
    text-transform: none;
    letter-spacing: normal;
  }

  .explainer {
    margin: 0;
    font-size: var(--text-sm);
    line-height: 1.5;
    color: var(--ink);
  }
</style>

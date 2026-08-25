<script lang="ts">
  import ConfidenceBadge from '../../components/ConfidenceBadge.svelte';
  import LockIcon from '../../components/LockIcon.svelte';
  import Sheet from '../../components/Sheet.svelte';
  import { conditions } from '../../stores/conditions.svelte';
  import { rigLock } from '../../stores/rigLock.svelte';
  import { settings } from '../../stores/settings.svelte';
  import { race } from '../store.svelte';
  import ControlRow from './ControlRow.svelte';
  import { explainText, explainTitle } from './copy';

  /**
   * Temporary home for the kite and dock controls, which have no panel of
   * their own yet: the kite rows move to Helm & Conditions and the dock rows
   * to the Rig panel in cockpit phase 05. Lifted out of `ControlPanel` as-is
   * so retiring that component did not also delete a working control.
   */
  const downValues = (race.controls.down ?? {}) as unknown as Record<string, number>;
  const dockValues = race.controls.dock as unknown as Record<string, number>;

  const DOWN_IDS = ['kiteHalyard', 'tackLine', 'kiteSheet', 'sprit'];
  const DOCK_IDS = ['upperTurns', 'lowerTurns', 'forestayMm'];

  const advanced = $derived(settings.advanced);
  /** Kite hoisted: the kite rows show in every tier, checkbox or not (ux-01 M-22). */
  const kiteUp = $derived(conditions.sailset === 'asym');

  let explaining: string | null = $state(null);
  let sheetOpen = $state(false);

  function explain(id: string): void {
    explaining = id;
    sheetOpen = true;
  }
</script>

{#if advanced || kiteUp}
  <section class="card" aria-labelledby="downwind-title">
    <h2 class="section-title" id="downwind-title">
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
        <ControlRow {id} values={downValues} tier="C" onexplain={explain} />
      {/each}
    {/if}
  </section>
{/if}

<section class="card" aria-labelledby="dock-title">
  <h2 class="section-title" id="dock-title">
    Dock setup
    {#if rigLock.lockedToday}
      <span class="locked-note"><LockIcon /> committed for the day</span>
    {:else}
      <span class="locked-note">not committed, free to explore</span>
    {/if}
  </h2>
  {#each DOCK_IDS as id (id)}
    <ControlRow {id} values={dockValues} locked={rigLock.lockedToday} onexplain={explain} />
  {/each}
</section>

<Sheet bind:open={sheetOpen} title={explainTitle(explaining)}>
  <p class="explainer">{explainText(explaining)}</p>
</Sheet>

<style>
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

<script lang="ts">
  import Toast from './Toast.svelte';
  import { copyText, shareUrl, type ShareState } from '../share';
  import type { Route } from '../router.svelte';
  import { conditions } from '../stores/conditions.svelte';
  import { settings } from '../stores/settings.svelte';
  import { race } from '../race/store.svelte';
  import { dock } from '../dock/store.svelte';
  import { track } from '../../lib/telemetry';

  /**
   * "Copy link": the state on screen as a URL a crewmate can open (ADR 0019).
   *
   * The URL is built from the live stores rather than read off `location`,
   * because App.svelte's writer is debounced — copying the address bar 400 ms
   * after a slider moved would hand out the trim before the drag.
   *
   * `shareState` overrides that for the callers with their own state to share
   * (a log entry, which is a trim from a different day, not the one on
   * screen). Named around `state`, which the `$state` rune already owns
   * inside a component.
   * It is a `ShareState` rather than a finished URL so that the callers that
   * live in lazy chunks — the Log screen — never import `share.ts` as a value
   * and drag its copy of the boat file out of the entry with it.
   */
  let {
    route = 'race',
    shareState,
    label = 'Copy link',
    title = 'Copy a link to this exact state — conditions, trim and rig — to paste to a crewmate.',
  }: {
    route?: Route;
    shareState?: ShareState;
    label?: string;
    title?: string;
  } = $props();

  function live(): ShareState {
    return {
      // The class rides along: the trim below is in its units, and a crewmate
      // opening the link on another class would read numbers that never
      // described this boat.
      boat: settings.boatId,
      condition: conditions.value,
      race: $state.snapshot(race.controls.race),
      down: race.controls.down ? $state.snapshot(race.controls.down) : undefined,
      dock: $state.snapshot(dock.setup),
      forecast: $state.snapshot(dock.forecast),
      tier: settings.mode,
    };
  }

  let toastOpen = $state(false);
  /** Set only when both clipboard paths failed: the link is shown to be
   *  selected by hand rather than a copy being claimed that never happened. */
  let failed: string | null = $state(null);
  let failedInput: HTMLInputElement | undefined = $state();

  async function copy(): Promise<void> {
    const link = shareUrl(route, shareState ?? live());
    if (await copyText(link)) {
      failed = null;
      toastOpen = true;
      track('share.copyLink');
      return;
    }
    failed = link;
    // Selected, so one keystroke finishes what the clipboard API would not.
    queueMicrotask(() => failedInput?.select());
  }
</script>

<button type="button" class="ghost" {title} onclick={() => void copy()}>{label}</button>

{#if failed}
  <label class="fallback">
    <span class="sr-only">Link to this trim — copy it by hand</span>
    <input bind:this={failedInput} type="text" readonly value={failed} />
  </label>
{/if}

<Toast bind:open={toastOpen} message="Link copied — paste it to a crewmate." />

<style>
  .ghost {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink);
    font-size: var(--text-sm);
    font-weight: 600;
    cursor: pointer;
  }

  .fallback {
    display: block;
    flex: 1 1 100%;
    min-width: 0;
  }

  .fallback input {
    width: 100%;
    min-height: var(--hit-min);
    padding: 0 var(--space-2);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--ink);
    font-size: var(--text-xs);
  }

  @media (min-width: 1280px) {
    .ghost {
      min-height: 32px;
      padding: 0 var(--space-2);
    }
  }
</style>

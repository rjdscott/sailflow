<script lang="ts">
  import { rigLock } from '../stores/rigLock.svelte';
  import { describeSetup } from './logic';

  let { oncommit }: { oncommit: () => void } = $props();

  /** Two-tap: the first tap arms, the second unlocks. No modal to mis-tap. */
  let armed = $state(false);

  const lock = $derived(rigLock.lockedToday ? rigLock.locked : null);
  const at = $derived(
    lock
      ? new Date(lock.committedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '',
  );

  function unlock(): void {
    if (!armed) {
      armed = true;
      return;
    }
    rigLock.unlock('unlocked at the dock before leaving');
    armed = false;
  }
</script>

{#if lock}
  <section class="card committed">
    <h2 class="section-title">Committed {at}</h2>
    <p class="line tabular-nums">{describeSetup(lock.setup)}</p>
    <button type="button" class="unlock" class:armed onclick={unlock}>
      {armed ? 'Tap again to unlock' : 'Unlock (rule C.9.5 — only before leaving the dock)'}
    </button>
    {#if armed}
      <p class="warn">
        C.9.5(a): the forestay may not be adjusted from the time the boat leaves the dock until
        racing has finished for the day.
      </p>
    {/if}
  </section>
{:else}
  <section class="card">
    <h2 class="section-title">Commit</h2>
    <button type="button" class="commit" onclick={oncommit}>Commit for today</button>
    <p class="note">Locks the rig for the day and starts a log entry.</p>
  </section>
{/if}

<style>
  .committed {
    border-color: var(--good);
  }

  .commit {
    width: 100%;
    min-height: var(--hit-min);
    border: none;
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--on-accent);
    font-size: var(--text-md);
    font-weight: 600;
    cursor: pointer;
  }

  .line {
    margin: 0 0 var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .note {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .unlock {
    width: 100%;
    min-height: var(--hit-min);
    border: 1px solid var(--ink-2);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .unlock.armed {
    border-color: var(--bad);
    color: var(--bad);
  }

  .warn {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--bad);
  }
</style>

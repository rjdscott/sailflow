<script lang="ts">
  import LockIcon from '../components/LockIcon.svelte';
  import { rigLock } from '../stores/rigLock.svelte';

  /**
   * Commit for today, and the way back out of it.
   *
   * Since ADR 0021 the sliders it freezes are on the same panel, so this is a
   * toggle beside them rather than a screen boundary: committed, they grey and
   * this line says when and offers the unlock; uncommitted, it says the day is
   * still free. The copy carries the rule, because navigation no longer does.
   */
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
  <p class="line">
    <LockIcon />
    <span class="tabular-nums">Committed {at}</span>
    <span aria-hidden="true">·</span>
    <button type="button" class="unlock" class:armed onclick={unlock}>
      {armed ? 'Tap again to unlock' : 'Unlock'}
    </button>
  </p>
  <p class="note">
    Committed — class rule C.9.5(a) freezes the standing rigging once you leave the dock. Unlock to
    explore.
  </p>
  {#if armed}
    <p class="warn">
      C.9.5(a): the forestay may not be adjusted from the time the boat leaves the dock until racing
      has finished for the day.
    </p>
  {/if}
{:else}
  <button type="button" class="commit" onclick={oncommit}>
    <LockIcon /> Commit for today
  </button>
  <p class="note">Not committed — free to explore. Commit greys these and stamps the log.</p>
{/if}

<style>
  .commit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
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
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .note,
  .warn {
    margin: var(--space-1) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .warn {
    color: var(--bad);
  }

  /* A text button, not a plate: unlocking is the C.9.5-violating direction, so
     it is deliberately quieter than Commit was (audit ux-01 M-07). */
  .unlock {
    min-height: var(--hit-min);
    padding: 0 var(--space-2);
    border: 1px solid var(--line-strong);
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
</style>

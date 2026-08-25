<script lang="ts">
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import InstrumentCell from '../components/InstrumentCell.svelte';
  import { OPTIMUM_REASON, OPTIMUM_TIER } from '../race/optimum.svelte';
  import type { DrillScore } from './store.svelte';

  let {
    score,
    stale = false,
    cTier = false,
    ontryagain,
    onnext,
  }: {
    score: DrillScore;
    /** The trim moved after this score was taken: still shown, marked stale. */
    stale?: boolean;
    cTier?: boolean;
    ontryagain: () => void;
    onnext: () => void;
  } = $props();

  const MEDAL = {
    gold: { glyph: '🥇', label: 'Gold' },
    silver: { glyph: '🥈', label: 'Silver' },
    bronze: { glyph: '🥉', label: 'Bronze' },
    none: { glyph: '·', label: 'No medal' },
  };

  function steps(n: number): string {
    const r = Math.round(n);
    return `${r} ${r === 1 ? 'click' : 'clicks'}`;
  }

  function clicks(steps: number): string {
    const sign = steps > 0 ? '+' : '−';
    const n = Math.abs(steps);
    return `${sign}${n} ${n === 1 ? 'click' : 'clicks'}`;
  }
</script>

<section class="card sheet" class:stale>
  <div class="head">
    <span class="glyph" aria-hidden="true">{MEDAL[score.medal].glyph}</span>
    <p class="medal">{stale ? 'Re-check' : MEDAL[score.medal].label}</p>
  </div>

  <!-- Both numbers on the cockpit's cell contract (ADR 0015), and both read
       off the same searched optimum, so they carry its tier, not the polar's
       (audit ux-02 H-02). -->
  <div class="cells">
    <InstrumentCell
      label="Off optimum"
      id="drillDistance"
      size="sm"
      value={String(Math.round(score.distanceSteps))}
      unit={Math.round(score.distanceSteps) === 1 ? 'click' : 'clicks'}
    />
    <InstrumentCell
      label="VMG lost"
      id="drillLoss"
      size="sm"
      value={score.lossPct.toFixed(1)}
      unit="%"
    />
    <p class="tierline">
      Both from the searched optimum
      <ConfidenceBadge tier={OPTIMUM_TIER} reason={OPTIMUM_REASON} />
    </p>
  </div>

  {#if stale}
    <p class="quiet">You have moved a control since this score. Press Check again.</p>
  {:else if score.isBest && score.prevBestSteps !== null}
    <p class="quiet">New best — your closest before this was {steps(score.prevBestSteps)}.</p>
  {:else if score.isBest}
    <p class="quiet">Closest you have been on this drill.</p>
  {:else if score.prevBestSteps !== null}
    <p class="quiet">Your best on this drill is {steps(score.prevBestSteps)}.</p>
  {/if}

  {#if score.hintUsed}
    <p class="quiet">
      Solved with a hint — recorded, and the spacing schedule grades this attempt one step lower.
    </p>
  {/if}

  {#if cTier}
    <p class="note">
      Tier C: the model gives the direction here, not the number. Treat the loss figure as a
      ranking, not a measurement.
    </p>
  {/if}

  {#if score.guideNote}
    <p class="note">{score.guideNote}</p>
  {/if}

  <!-- The coach line itself lives in the Goal card, where it stays on screen
       and above the sliders while the learner acts on it (audit ux-02 M-06). -->
  {#if score.deltas.length}
    <ul class="deltas">
      {#each score.deltas as d (d.key)}
        <li class:zero={d.steps === 0}>
          <span>{d.label}</span>
          <span class="tabular-nums">{d.steps === 0 ? 'spot on' : clicks(d.steps)}</span>
        </li>
      {/each}
    </ul>
    <p class="quiet">
      The same answer is a ghost tick on each slider now, or take it in one move with
      <em>Apply the answer</em>.
    </p>
  {/if}

  <div class="actions">
    <button type="button" class="secondary" onclick={ontryagain}>Try again</button>
    <button type="button" class="primary" onclick={onnext}>Next drill</button>
  </div>
</section>

<style>
  .sheet {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .head {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .glyph {
    font-size: var(--text-2xl);
  }

  .medal,
  .note,
  .quiet {
    margin: 0;
  }

  .cells {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-3) var(--space-4);
    align-items: center;
  }

  .tierline {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  /* Stale: the numbers still belong to the trim they were taken on, so they
     stay legible — dimmed, not hidden (audit ux-02 M-06). */
  .sheet.stale {
    opacity: 0.65;
  }

  .quiet {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .medal {
    font-size: var(--text-lg);
    color: var(--ink);
  }

  /* Same quiet warn strip as the drill view's C-tier banner. */
  .note {
    padding: var(--space-2) var(--space-3);
    border-inline-start: 3px solid var(--warn);
    border-radius: 0 var(--radius) var(--radius) 0;
    background: color-mix(in srgb, var(--warn) 12%, transparent);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .deltas {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
  }

  .deltas li {
    display: flex;
    justify-content: space-between;
    gap: var(--space-3);
    color: var(--ink);
  }

  .deltas li.zero {
    color: var(--ink-2);
  }

  .actions {
    display: flex;
    gap: var(--space-2);
  }

  .actions button {
    flex: 1;
    min-height: var(--hit-min);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .primary {
    background: var(--accent);
    color: var(--on-accent);
    border: 1px solid var(--accent);
  }

  .secondary {
    background: transparent;
    color: var(--ink);
    border: 1px solid var(--line-strong);
  }
</style>

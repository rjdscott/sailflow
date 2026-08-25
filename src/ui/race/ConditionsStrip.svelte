<script lang="ts">
  import boat from '../../../data/boats/j70.json';
  import type { SailSet, SeaState } from '../../core/types';
  import Segmented from '../components/Segmented.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Slider from '../components/Slider.svelte';
  import { conditions, PRESETS, SEA_STATES } from '../stores/conditions.svelte';
  import { nearestPointOfSail, POINTS_OF_SAIL } from './pointOfSail';
  import { race } from './store.svelte';

  const TWS_MIN = 2;
  const TWS_MAX = 30;

  let open = $state(false);

  const seaLabel = $derived(SEA_STATES[conditions.seaState].label);
  const active = $derived(nearestPointOfSail(conditions.twaDeg));

  function stepTws(delta: number): void {
    conditions.twsKt = Math.min(TWS_MAX, Math.max(TWS_MIN, conditions.twsKt + delta));
  }
</script>

<div class="chip-row" aria-label="Point of sail">
  {#each POINTS_OF_SAIL as p (p.id)}
    <button
      type="button"
      class="chip hit-44"
      aria-pressed={active === p.id}
      aria-busy={race.pointOfSailBusy === p.id}
      onclick={() => race.setPointOfSail(p.id)}
    >
      {p.label}{#if race.pointOfSailBusy === p.id}<span class="busy">…</span>{/if}
    </button>
  {/each}
</div>

<div class="chip-row" aria-label="Conditions">
  <span class="chip stepper">
    <button
      type="button"
      class="step"
      aria-label="Wind speed down one knot"
      onclick={() => stepTws(-1)}
      disabled={conditions.twsKt <= TWS_MIN}>−</button
    >
    <span class="tws">{conditions.twsKt.toFixed(0)} kt</span>
    <button
      type="button"
      class="step"
      aria-label="Wind speed up one knot"
      onclick={() => stepTws(1)}
      disabled={conditions.twsKt >= TWS_MAX}>+</button
    >
  </span>
  <span class="chip">{conditions.twaDeg.toFixed(0)}° TWA</span>
  <span class="chip">{seaLabel}</span>
  <span class="chip">{conditions.crewKg.toFixed(0)} kg</span>
  <span class="chip">{conditions.sailset === 'asym' ? 'Gennaker' : 'Jib'}</span>
  <button type="button" class="chip hit-44" onclick={() => (open = true)}>Edit</button>
</div>

<Sheet bind:open title="Conditions">
  <p class="section-title">Presets</p>
  <div class="presets">
    {#each PRESETS as p (p.id)}
      <button type="button" onclick={() => race.applyPreset(p)}>{p.label}</button>
    {/each}
  </div>
  <p class="note">Presets are starting points for the sliders, not tuning-guide settings.</p>

  <Slider
    label="True wind speed"
    bind:value={conditions.twsKt}
    min={2}
    max={30}
    step={1}
    unit="kt"
    decimals={0}
  />
  <Slider
    label="True wind angle"
    bind:value={conditions.twaDeg}
    min={20}
    max={180}
    step={1}
    unit="°"
    decimals={0}
  />
  <Slider
    label="Crew weight"
    bind:value={conditions.crewKg}
    min={boat.crew.minKg}
    max={boat.crew.maxKg}
    step={5}
    unit="kg"
    decimals={0}
  />

  <div class="field">
    <span>Sea state</span>
    <Segmented
      ariaLabel="Sea state"
      options={SEA_STATES.map((s) => ({ value: String(s.value), label: s.label }))}
      value={String(conditions.seaState)}
      onchange={(v) => (conditions.seaState = Number(v) as SeaState)}
    />
  </div>

  <div class="field">
    <span>Sail set</span>
    <Segmented
      ariaLabel="Sail set"
      options={[
        { value: 'jib', label: 'Jib' },
        { value: 'asym', label: 'Gennaker' },
      ]}
      value={conditions.sailset}
      onchange={(v) => (conditions.sailset = v as SailSet)}
    />
  </div>
</Sheet>

<style>
  /* The point-of-sail row is the primary angle control; the sheet's TWA slider
     stays for fine work. At 390 px the five chips wrap to two rows. */
  button.chip[aria-pressed='true'] {
    background: var(--accent);
    color: var(--on-accent);
  }

  .busy {
    margin-left: var(--space-1);
  }

  /* One-tap wind speed. 44 px buttons make the pill taller than a plain chip. */
  .stepper {
    height: auto;
    min-height: var(--hit-min);
    padding: 0;
    gap: 0;
  }

  .step {
    width: var(--hit-min);
    min-height: var(--hit-min);
    border: none;
    border-radius: 999px;
    background: transparent;
    color: var(--accent);
    font-size: var(--text-md);
    line-height: 1;
    cursor: pointer;
  }

  .step:disabled {
    color: var(--muted);
    cursor: default;
  }

  .tws {
    min-width: 4ch;
    text-align: center;
  }

  .presets {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-2);
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

  .note {
    margin: var(--space-2) 0 var(--space-4);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .field {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding-block: var(--space-2);
    font-size: var(--text-sm);
  }
</style>

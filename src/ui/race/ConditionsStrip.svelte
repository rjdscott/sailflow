<script lang="ts">
  import boat from '../../../data/boats/j70.json';
  import type { SailSet, SeaState } from '../../core/types';
  import Segmented from '../components/Segmented.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Slider from '../components/Slider.svelte';
  import { conditions, PRESETS, SEA_STATES } from '../stores/conditions.svelte';
  import { race } from './store.svelte';

  let open = $state(false);

  const seaLabel = $derived(SEA_STATES[conditions.seaState].label);
</script>

<div class="chip-row" aria-label="Conditions">
  <span class="chip">{conditions.twsKt.toFixed(0)} kt</span>
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

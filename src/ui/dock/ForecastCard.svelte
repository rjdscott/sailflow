<script lang="ts">
  import type { Forecast, SeaState } from '../../core/types';
  import Slider from '../components/Slider.svelte';
  import Segmented from '../components/Segmented.svelte';
  import { boat, clampForecast } from './logic';
  import { fmt } from '../format';

  let { forecast }: { forecast: Forecast } = $props();

  // ponytail: three native range inputs, not an overlaid dual-thumb track.
  // The overlay needs pointer-events juggling and a custom a11y story; three
  // labelled sliders are keyboard- and screen-reader-correct for free.
  // Upgrade to a dual thumb only if the three-slider version tests badly.
  $effect(() => clampForecast(forecast));

  const SEA: { value: string; label: string }[] = [
    { value: '0', label: 'Flat' },
    { value: '1', label: 'Ripple' },
    { value: '2', label: 'Chop' },
    { value: '3', label: 'Steep' },
    { value: '4', label: 'Waves' },
  ];

  const crew = boat.crew;

  function stepCrew(delta: number): void {
    const next = forecast.crewKg + delta;
    forecast.crewKg = Math.min(crew.maxKg, Math.max(crew.minKg, next));
  }
</script>

<section class="card">
  <h2>Forecast</h2>
  <p class="range tabular-nums">
    {fmt(forecast.minKt, 0)}–{fmt(forecast.maxKt, 0)} kt, likely {fmt(forecast.likelyKt, 0)} kt
  </p>

  <Slider
    label="Min wind"
    bind:value={forecast.minKt}
    min={0}
    max={30}
    step={1}
    unit="kt"
    decimals={0}
  />
  <Slider
    label="Likely wind"
    bind:value={forecast.likelyKt}
    min={0}
    max={30}
    step={1}
    unit="kt"
    decimals={0}
    hint="The band the day is most likely to sit in."
  />
  <Slider
    label="Max wind"
    bind:value={forecast.maxKt}
    min={0}
    max={30}
    step={1}
    unit="kt"
    decimals={0}
  />

  <div class="row">
    <span class="label">Sea state</span>
    <Segmented
      ariaLabel="Sea state"
      options={SEA}
      value={String(forecast.seaState)}
      onchange={(v) => (forecast.seaState = Number(v) as SeaState)}
    />
  </div>

  <div class="row">
    <span class="label">Crew weight</span>
    <div class="stepper">
      <button
        type="button"
        onclick={() => stepCrew(-5)}
        disabled={forecast.crewKg <= crew.minKg}
        aria-label="Decrease crew weight by 5 kg">−</button
      >
      <span class="crew tabular-nums" aria-live="polite">{fmt(forecast.crewKg, 0, 'kg')}</span>
      <button
        type="button"
        onclick={() => stepCrew(5)}
        disabled={forecast.crewKg >= crew.maxKg}
        aria-label="Increase crew weight by 5 kg">+</button
      >
    </div>
  </div>
  <p class="hint">Class limit {crew.minKg}–{crew.maxKg} kg, minimum {crew.minCount} crew.</p>
</section>

<style>
  .card {
    background: var(--surface);
    border-radius: var(--radius);
    padding: var(--space-3);
    margin-block-end: var(--space-4);
  }

  h2 {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
    font-weight: 600;
  }

  .range {
    margin: var(--space-1) 0 var(--space-2);
    font-size: var(--text-lg);
    color: var(--ink);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    min-height: var(--hit-min);
    flex-wrap: wrap;
  }

  .label {
    font-size: var(--text-sm);
    color: var(--ink);
  }

  .stepper {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .stepper button {
    min-width: var(--hit-min);
    min-height: var(--hit-min);
    border: 1px solid var(--ink-2);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    font-size: var(--text-lg);
    cursor: pointer;
  }

  .stepper button:disabled {
    opacity: 0.4;
    cursor: default;
  }

  .crew {
    font-size: var(--text-lg);
    min-width: 5em;
    text-align: center;
  }

  .hint {
    margin: var(--space-1) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>

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
  <h2 class="section-title">Forecast</h2>
  <p class="range tabular-nums">
    {fmt(forecast.minKt, 0)}–{fmt(forecast.maxKt, 0)} kt<span class="likely"
      >likely {fmt(forecast.likelyKt, 0)} kt</span
    >
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
  .range {
    margin: 0 0 var(--space-2);
    font-size: var(--text-lg);
    color: var(--ink);
    white-space: nowrap;
  }

  .likely {
    margin-inline-start: var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink-2);
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

  /* The Slider's stepper, to the pixel: same 44 px square, same --line-strong
     outline, so the two steppers on this card are one control language. */
  .stepper button {
    width: var(--hit-min);
    height: var(--hit-min);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink);
    font-size: var(--text-lg);
    line-height: 1;
    cursor: pointer;
  }

  .stepper button:disabled {
    color: var(--muted);
    border-color: var(--line);
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

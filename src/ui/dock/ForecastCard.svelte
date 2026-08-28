<script lang="ts">
  import Slider from '../components/Slider.svelte';
  import { clampForecast } from './logic';
  import type { WindBand } from './store.svelte';

  /**
   * The wind band the rig is tuned for: min, likely, max. Sheet content for
   * the Rig panel's `edit` (ADR 0021) — sea state and crew are the instrument
   * band's now, so this card is the three wind sliders and nothing else.
   */
  let { wind }: { wind: WindBand } = $props();

  // ponytail: three native range inputs, not an overlaid dual-thumb track.
  // The overlay needs pointer-events juggling and a custom a11y story; three
  // labelled sliders are keyboard- and screen-reader-correct for free.
  // Upgrade to a dual thumb only if the three-slider version tests badly.
  $effect(() => clampForecast(wind));
</script>

<Slider label="Min wind" bind:value={wind.minKt} min={0} max={30} step={1} unit="kt" decimals={0} />
<Slider
  label="Likely wind"
  bind:value={wind.likelyKt}
  min={0}
  max={30}
  step={1}
  unit="kt"
  decimals={0}
  hint="The band the day is most likely to sit in. The rig is committed against the whole band, not this one number."
/>
<Slider label="Max wind" bind:value={wind.maxKt} min={0} max={30} step={1} unit="kt" decimals={0} />

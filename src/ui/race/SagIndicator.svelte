<script lang="ts">
  import BulletGauge from '../components/BulletGauge.svelte';

  /**
   * Headstay sag on the Headsail panel, and the cross-effect it exists to
   * carry: the backstay lives on the Mainsail panel because that is where the
   * hand is, but what it does to the jib shows up here (ADR 0015).
   */
  let { sagMm, onexplain }: { sagMm: number; onexplain?: (id: string) => void } = $props();

  /**
   * Drawing range only, millimetres. The model's own corpus spans 8–42 mm
   * across the whole polar and both rigs, so the bar is scaled to hold it.
   * prov: assumed, read off `validation/golden`.
   */
  const MAX_MM = 45;
</script>

<div class="sag">
  <BulletGauge
    label="HEADSTAY SAG"
    id="sag"
    unit="mm"
    value={sagMm}
    min={0}
    max={MAX_MM}
    tier="C"
    {onexplain}
  />
  <p class="note">Backstay on → sag off: a straighter headstay flattens the jib's entry.</p>
</div>

<style>
  .sag {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }

  .note {
    margin: 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>

<script lang="ts">
  /**
   * One numeric field in the log form. `value` is `number | null`: an empty
   * input reads back as null — "not recorded" — instead of a 0 that exports
   * as real data (audit ux-02 H-05).
   */
  let {
    label,
    value = $bindable(null),
    min,
    max,
    step = 0.1,
    unit = '',
    required = false,
  }: {
    label: string;
    value?: number | null;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    required?: boolean;
  } = $props();
</script>

<label class="field">
  <span>{label}{unit ? ` (${unit})` : ''}</span>
  <input type="number" inputmode="decimal" {min} {max} {step} bind:value {required} />
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--ink-2);
    /* Grid and flex items floor at the input's intrinsic ~20ch otherwise, and
       three of them push the page sideways (audit ux-02 H-05). */
    min-width: 0;
  }

  input {
    width: 100%;
    min-height: var(--hit-min);
    padding: var(--space-2);
    border: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    font-size: var(--text-md);
  }
</style>

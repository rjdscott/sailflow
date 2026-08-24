<script lang="ts">
  let {
    label,
    value = $bindable(0),
    step = 0.1,
    unit = '',
    required = false,
  }: {
    label: string;
    value?: number;
    step?: number;
    unit?: string;
    required?: boolean;
  } = $props();
</script>

<label class="field">
  <span>{label}{unit ? ` (${unit})` : ''}</span>
  <input type="number" inputmode="decimal" {step} bind:value {required} />
</label>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  input {
    min-height: var(--hit-min);
    padding: var(--space-2);
    border: 1px solid var(--surface);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    font-size: var(--text-md);
  }
</style>

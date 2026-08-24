<script lang="ts" generics="T extends string">
  let {
    options,
    value = $bindable(),
    ariaLabel,
    onchange,
  }: {
    options: { value: T; label: string }[];
    value: T;
    ariaLabel?: string;
    onchange?: (value: T) => void;
  } = $props();

  function select(v: T): void {
    value = v;
    onchange?.(v);
  }
</script>

<div class="segmented" role="radiogroup" aria-label={ariaLabel}>
  {#each options as opt (opt.value)}
    <button
      type="button"
      role="radio"
      aria-checked={value === opt.value}
      class:active={value === opt.value}
      onclick={() => select(opt.value)}
    >
      {opt.label}
    </button>
  {/each}
</div>

<style>
  .segmented {
    display: inline-flex;
    background: var(--surface);
    border-radius: var(--radius);
    padding: 2px;
    gap: 2px;
  }

  button {
    min-height: var(--hit-min);
    padding: var(--space-1) var(--space-3);
    border: none;
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  button.active {
    background: var(--accent);
    color: var(--on-accent);
  }
</style>

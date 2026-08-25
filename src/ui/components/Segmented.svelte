<script lang="ts" generics="T extends string">
  import { rovingIndex } from './logic';

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

  let btns: HTMLButtonElement[] = [];

  // Roving tabindex: the group is one tab stop, arrows move within it, as the
  // radiogroup role already promises (audit ux-01 M-17).
  const index = $derived(
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  );

  function select(v: T): void {
    value = v;
    onchange?.(v);
  }

  function onKeyDown(e: KeyboardEvent): void {
    const next = rovingIndex(e.key, index, options.length);
    if (next === null) return;
    e.preventDefault();
    select(options[next].value);
    btns[next]?.focus();
  }
</script>

<div class="segmented" role="radiogroup" aria-label={ariaLabel}>
  {#each options as opt, i (opt.value)}
    <button
      bind:this={btns[i]}
      type="button"
      role="radio"
      aria-checked={value === opt.value}
      tabindex={i === index ? 0 : -1}
      class:active={value === opt.value}
      onclick={() => select(opt.value)}
      onkeydown={onKeyDown}
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

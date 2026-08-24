<script lang="ts">
  import Slider from '../components/Slider.svelte';
  import Readout from '../components/Readout.svelte';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import Toggle from '../components/Toggle.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Toast from '../components/Toast.svelte';
  import BottomNav from '../components/BottomNav.svelte';
  import TopBar from '../components/TopBar.svelte';

  let plain = $state(30);
  let locked = $state(40);
  let ticked = $state(0);

  let sheetOpen = $state(false);
  let toastOpen = $state(false);

  let seg = $state<'a' | 'b' | 'c'>('a');
</script>

<TopBar title="Kit" />

<h2>Slider</h2>
<Slider label="Plain" bind:value={plain} min={0} max={100} step={1} unit="%" />
<Slider label="With tick" bind:value={ticked} min={-20} max={20} step={1} unit="mm" tick={0} />
<Slider label="Locked" bind:value={locked} min={0} max={100} step={1} unit="%" locked />
<Slider
  label="With tier + hint"
  bind:value={plain}
  min={0}
  max={100}
  step={1}
  unit="%"
  tier="B"
  hint="Example hint text."
/>

<h2>Readout</h2>
<Readout label="Small" value={6.2} unit="kt" tier="A" size="sm" />
<Readout label="Large" value={6.2} unit="kt" tier="B" size="lg" decimals={2} />

<h2>ConfidenceBadge</h2>
<p><ConfidenceBadge tier="A" /> <ConfidenceBadge tier="B" /> <ConfidenceBadge tier="C" /></p>

<h2>Toggle</h2>
<Toggle />

<h2>Segmented</h2>
<Segmented
  ariaLabel="Kit example"
  options={[
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
  ]}
  bind:value={seg}
/>

<h2>Sheet</h2>
<button type="button" onclick={() => (sheetOpen = true)}>Open sheet</button>
<Sheet bind:open={sheetOpen} title="Example sheet">
  <p>Sheet content. Closes on backdrop click or Escape.</p>
</Sheet>

<h2>Toast</h2>
<button type="button" onclick={() => (toastOpen = true)}>Show toast</button>
<Toast message="Example toast" bind:open={toastOpen} />

<h2>BottomNav</h2>
<BottomNav />

<style>
  h2 {
    font-size: var(--text-sm);
    color: var(--ink-2);
    margin: var(--space-6) 0 var(--space-2);
  }

  button {
    min-height: var(--hit-min);
    padding: 0 var(--space-4);
    border-radius: var(--radius);
    border: 1px solid var(--accent);
    background: var(--bg);
    color: var(--accent);
  }
</style>

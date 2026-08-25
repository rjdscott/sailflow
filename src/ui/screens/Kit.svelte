<script lang="ts">
  import Slider from '../components/Slider.svelte';
  import Readout from '../components/Readout.svelte';
  import ConfidenceBadge from '../components/ConfidenceBadge.svelte';
  import DensityToggle from '../components/DensityToggle.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Toast from '../components/Toast.svelte';
  import BottomNav from '../components/BottomNav.svelte';
  import NavRail from '../components/NavRail.svelte';
  import TopBar from '../components/TopBar.svelte';

  let plain = $state(30);
  let locked = $state(40);
  let ticked = $state(0);

  let sheetOpen = $state(false);
  let toastOpen = $state(false);

  let seg = $state<'a' | 'b' | 'c'>('a');
</script>

<TopBar title="Kit" />

<div class="chip-row">
  <span class="chip">10 kt</span>
  <span class="chip">42° TWA</span>
  <span class="chip">Ripple</span>
  <button type="button" class="chip hit-44">Edit</button>
</div>

<div class="screen">
  <div class="col-primary stack">
    <section class="card">
      <h2 class="section-title">Layout primitives</h2>
      <p class="body">
        <code>.screen</code> is the page grid — one column below 1024, then
        <code>7fr 5fr</code> with <code>.col-primary</code> / <code>.col-secondary</code>.
        <code>.card</code> is the only container; <code>.stack</code> gives it 16 px rhythm;
        <code>.lg-only</code> / <code>.lg-hide</code> pick a variant with CSS instead of JS.
      </p>
    </section>

    <section class="card">
      <h2 class="section-title">Hero number</h2>
      <div class="heroes">
        <span class="hero-number">5.2<span class="hero-unit">kt</span></span>
        <span class="hero-number">42<span class="hero-unit">°</span></span>
        <span class="hero-number">3.87<span class="hero-unit">kt</span></span>
      </div>
    </section>

    <section class="card">
      <h2 class="section-title">Mono number table</h2>
      <table class="mono">
        <tbody>
          <tr><th scope="row">Draft</th><td>12.4%</td></tr>
          <tr><th scope="row">Position</th><td>44%</td></tr>
          <tr><th scope="row">Twist</th><td>9°</td></tr>
        </tbody>
      </table>
    </section>

    <section class="card">
      <h2 class="section-title">Slider</h2>
      <Slider label="Plain" bind:value={plain} min={0} max={100} step={1} unit="%" />
      <Slider
        label="With tick"
        bind:value={ticked}
        min={-20}
        max={20}
        step={1}
        unit="mm"
        tick={0}
      />
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
    </section>
  </div>

  <div class="col-secondary stack">
    <section class="card">
      <h2 class="section-title">Readout</h2>
      <Readout label="Small" value={6.2} unit="kt" tier="A" size="sm" />
      <Readout label="Large" value={6.2} unit="kt" tier="B" size="lg" decimals={2} />
    </section>

    <section class="card">
      <h2 class="section-title">Confidence badge</h2>
      <p><ConfidenceBadge tier="A" /> <ConfidenceBadge tier="B" /> <ConfidenceBadge tier="C" /></p>
    </section>

    <section class="card">
      <h2 class="section-title">Density toggle and segmented</h2>
      <p><DensityToggle /></p>
      <Segmented
        ariaLabel="Kit example"
        options={[
          { value: 'a', label: 'A' },
          { value: 'b', label: 'B' },
          { value: 'c', label: 'C' },
        ]}
        bind:value={seg}
      />
    </section>

    <section class="card">
      <h2 class="section-title">Sheet and toast</h2>
      <button type="button" onclick={() => (sheetOpen = true)}>Open sheet</button>
      <button type="button" onclick={() => (toastOpen = true)}>Show toast</button>
      <Sheet bind:open={sheetOpen} title="Example sheet">
        <p>Sheet content. Closes on backdrop click or Escape.</p>
      </Sheet>
      <Toast message="Example toast" bind:open={toastOpen} />
    </section>

    <section class="card">
      <h2 class="section-title">Navigation</h2>
      <p class="body">Bottom tab bar below 1024, left rail at or above it.</p>
      <BottomNav />
      <div class="rail-demo"><NavRail /></div>
    </section>
  </div>
</div>

<style>
  .heroes {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    margin-top: var(--space-2);
  }

  .body {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  code {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--ink);
  }

  table {
    width: 100%;
    margin-top: var(--space-2);
    text-align: right;
  }

  th {
    text-align: left;
    font-weight: 500;
    color: var(--ink-2);
  }

  /* The rail is position:fixed in use; the demo shows it in place. */
  .rail-demo {
    position: relative;
    height: 340px;
    margin-top: var(--space-3);
    overflow: hidden;
  }

  .rail-demo :global(.nav-rail) {
    position: absolute;
  }

  button {
    min-height: var(--hit-min);
    margin-right: var(--space-2);
    padding: 0 var(--space-4);
    border-radius: var(--radius);
    border: 1px solid var(--accent);
    background: var(--bg);
    color: var(--accent);
  }
</style>

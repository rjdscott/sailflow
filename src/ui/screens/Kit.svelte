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
  import InstrumentCell from '../components/InstrumentCell.svelte';
  import BulletGauge from '../components/BulletGauge.svelte';
  import Sparkline from '../components/Sparkline.svelte';
  import Panel from '../components/Panel.svelte';
  import { heelBands } from '../instruments/gauges';

  let plain = $state(30);
  let locked = $state(40);
  let ticked = $state(0);

  let sheetOpen = $state(false);
  let toastOpen = $state(false);

  let seg = $state<'a' | 'b' | 'c'>('a');

  // Cockpit gallery (phase 01B). Fixed sample data: the gallery shows the
  // contract, not live physics.
  let panelSheet = $state(62);
  let panelTraveller = $state(-2);
  let explained = $state('');

  const trend = [5.1, 5.16, 5.2, 5.18, 5.25, 5.31, 5.28, 5.42];
  const heel = heelBands(10);
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

    <section class="card">
      <h2 class="section-title">Instrument cell</h2>
      <p class="body">
        One contract for every number: label · value · unit · tier badge · labelled delta · trend.
        The delta is ink, never red or green. Density comes from
        <code>data-tier</code> on the root, so learn spells the delta out and hides the trend,
        analyse shows the trend even at <code>sm</code>.
      </p>
      <div class="cells">
        <InstrumentCell
          label="BSP"
          id="bsp"
          value="5.42"
          unit="kt"
          tier="A"
          size="lg"
          {trend}
          target={{ text: '5.80', delta: '+0.38', label: 'vs optimum' }}
          onexplain={(id) => (explained = id)}
        />
        <InstrumentCell label="VMG" id="vmg" value="3.87" unit="kt" tier="B" size="md" {trend} />
        <InstrumentCell
          label="Heel"
          id="heel"
          value="12"
          unit="°"
          tier="C"
          size="sm"
          {trend}
          target={{ text: '14', delta: '+2', label: 'vs optimum' }}
        />
        <InstrumentCell label="AWA" id="awa" value="27" unit="°" size="sm" />
      </div>
      {#if explained}<p class="body">Explain requested for: <code>{explained}</code></p>{/if}
    </section>

    <section class="card">
      <h2 class="section-title">Bullet gauge</h2>
      <p class="body">
        Three qualitative bands, one value mark, one target bug. Darkest band is the worst end,
        which flips with <code>betterIs</code>. A scale that does not start at zero draws the value
        as a marker, not a bar.
      </p>
      <div class="gauges">
        <BulletGauge
          label="Heel"
          value={12}
          min={0}
          max={20}
          target={heel.target}
          ranges={[heel.lo, heel.hi]}
          unit="°"
          tier="B"
        />
        <BulletGauge
          label="Leech stall"
          value={14}
          min={0}
          max={40}
          target={8}
          ranges={[10, 20]}
          betterIs="less"
          unit="%"
        />
        <BulletGauge
          label="Shroud tension"
          value={32}
          min={20}
          max={40}
          target={30}
          ranges={[26, 34]}
          unit="Loos"
          tier="C"
        />
      </div>
    </section>

    <section class="card">
      <h2 class="section-title">Sparkline</h2>
      <p class="body">Shape only, no axes, hidden from the accessibility tree.</p>
      <p><Sparkline points={trend} /></p>
      <p class="body">Under two points it draws nothing: <Sparkline points={[5.1]} /></p>
    </section>

    <Panel
      title="Mainsheet"
      id="kit-panel-main"
      cue="Ease until the top telltale streams, then trim back a touch."
    >
      {#snippet controls()}
        <Slider label="Mainsheet" bind:value={panelSheet} min={0} max={100} step={1} unit="%" />
        <Slider
          label="Traveller"
          bind:value={panelTraveller}
          min={-10}
          max={10}
          step={1}
          unit="cm"
        />
      {/snippet}
      {#snippet visual()}
        <svg viewBox="0 0 120 90" class="dummy-visual" role="img" aria-label="Placeholder drawing">
          <rect x="8" y="8" width="104" height="74" rx="4" />
        </svg>
      {/snippet}
      {#snippet instruments()}
        <InstrumentCell label="Twist" id="twist" value="9" unit="°" tier="B" size="sm" />
        <InstrumentCell label="Draft" id="draft" value="12.4" unit="%" tier="B" size="sm" />
      {/snippet}
    </Panel>
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

  .cells,
  .gauges {
    display: grid;
    gap: var(--space-4);
    margin-top: var(--space-3);
  }

  .cells {
    grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
    align-items: start;
  }

  .dummy-visual {
    width: 100%;
    height: auto;
  }

  .dummy-visual rect {
    fill: var(--muted);
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

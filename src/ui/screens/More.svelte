<script lang="ts">
  import '../_layout-fallback.css';
  import TopBar from '../components/TopBar.svelte';
  import Segmented from '../components/Segmented.svelte';
  import { settings, type Theme } from '../stores/settings.svelte';
  import { router } from '../router.svelte';
  import { logStoreEngine } from '../../lib/logStore';
  import { GUIDE_LABELS, referenceStatus, type GuideId } from '../../lib/reference';

  const VERSION = import.meta.env.VITE_APP_VERSION;
  const REPO = 'https://github.com/rjdscott/sailflow/blob/main';

  const engine = logStoreEngine();
  const status = referenceStatus();
</script>

<TopBar title="More" />

<div class="screen">
  <div class="col-primary">
    <section class="card">
      <h2 class="section-title">Appearance</h2>
      <Segmented
        ariaLabel="Theme"
        options={[
          { value: 'auto', label: 'Auto' },
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
        ]}
        value={settings.theme}
        onchange={(v: Theme) => settings.setTheme(v)}
      />
      <p class="note">
        Auto follows the system. Animation is reduced automatically when your system's reduce-motion
        setting is on.
      </p>
    </section>

    <section class="card">
      <h2 class="section-title">Data</h2>
      <dl class="rows">
        <dt>Storage</dt>
        <dd>{engine}, on this device only. Nothing is uploaded.</dd>
        {#each Object.entries(status) as [id, s] (id)}
          <dt>{GUIDE_LABELS[id as GuideId]}</dt>
          <dd>{s.loaded ? `loaded, ${s.revision || 'no revision stated'}` : 'not loaded'}</dd>
        {/each}
      </dl>
      <p class="note">Export JSON, export CSV and import live in the log toolbar.</p>
      <button type="button" class="quiet" onclick={() => router.navigate('log')}>
        Open the log
      </button>
    </section>
  </div>

  <div class="col-secondary">
    <section class="card">
      <h2 class="section-title">About</h2>
      <p class="version tabular-nums">Sailflow v{VERSION}</p>
      <p class="honesty">
        Sailflow implements the documented ORC VPP parametric aero model, plus an explicitly
        invented rig-bend-to-sail-shape sensitivity layer for which there is no public evidence base
        on a J/70. It is calibrated against the ORC J/70 Speed Guide polar with held-out points, and
        parametric VPPs are known to under-predict boat speed against CFD-based tools. Every output
        carries a confidence tier — A is a number, B is a direction and a band, C is a direction
        only — because this is a decision-rehearsal tool, not a wind tunnel.
      </p>
      <ul class="links">
        <li><a href="{REPO}/PROVENANCE.md">Provenance of every third-party number</a></li>
        <li><a href="{REPO}/ASSUMPTIONS.md">Assumptions, and where the model is weak</a></li>
        <li><a href="{REPO}/validation/report.md">Validation report</a></li>
      </ul>
    </section>
  </div>
</div>

<style>
  .note {
    margin: var(--space-3) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .rows {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-1) var(--space-3);
    margin: 0;
    font-size: var(--text-sm);
  }

  .rows dt {
    color: var(--ink-2);
    white-space: nowrap;
  }

  .rows dd {
    margin: 0;
    color: var(--ink);
  }

  .quiet {
    min-height: var(--hit-min);
    margin-block-start: var(--space-2);
    padding: 0 var(--space-3);
    border: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .version {
    margin: 0 0 var(--space-2);
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .honesty {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink);
    max-width: 68ch;
  }

  .links {
    list-style: none;
    display: grid;
    gap: var(--space-1);
    margin: var(--space-3) 0 0;
    padding: 0;
    font-size: var(--text-sm);
  }

  .links a {
    display: inline-flex;
    align-items: center;
    min-height: var(--hit-min);
    color: var(--accent);
  }
</style>

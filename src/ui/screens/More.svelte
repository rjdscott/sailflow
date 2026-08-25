<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Toast from '../components/Toast.svelte';
  import { settings, type Theme } from '../stores/settings.svelte';
  import { router } from '../router.svelte';
  import { logStoreEngine } from '../../lib/logStore';
  import { download } from '../../lib/logExport';
  import { feedbackUrl } from '../../lib/feedback';
  import {
    exportJson,
    reset as resetTelemetry,
    snapshot,
    TELEMETRY_EVENTS,
    TELEMETRY_LABELS,
    type TelemetryCounts,
  } from '../../lib/telemetry';
  import { logStoreUi } from '../log/store.svelte';
  import { GUIDE_LABELS, referenceStatus, type GuideId } from '../../lib/reference';

  const VERSION = import.meta.env.VITE_APP_VERSION;
  const REPO = 'https://github.com/rjdscott/sailflow/blob/main';

  const engine = logStoreEngine();
  const status = referenceStatus();

  let counts = $state<TelemetryCounts | null>(null);
  let toast = $state('');
  let toastOpen = $state(false);

  // Reads no reactive state, so this settles once on mount.
  $effect(() => {
    void snapshot().then((s) => (counts = s));
  });

  function say(message: string): void {
    toast = message;
    toastOpen = true;
  }

  async function exportUsage(): Promise<void> {
    download('sailflow-usage.json', await exportJson(), 'application/json');
    say('Usage counts saved to your downloads.');
  }

  async function resetUsage(): Promise<void> {
    await resetTelemetry();
    counts = await snapshot();
    say('Usage counts reset.');
  }

  /* Two taps, same pattern as unlocking the rig and deleting an entry — no
     native confirm(), which a PWA renders as a browser chrome dialog. */
  let resetArmed = $state(false);

  async function resetLog(): Promise<void> {
    if (!resetArmed) {
      resetArmed = true;
      return;
    }
    resetArmed = false;
    const ok = await logStoreUi.reset();
    say(ok ? 'Log reset — every entry deleted' : (logStoreUi.error ?? 'Reset failed'));
  }
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
      <p class="note">Export, import and backup live under Backup in the log toolbar.</p>
      <div class="data-actions">
        <button type="button" class="quiet" onclick={() => router.navigate('log')}>
          Open the log
        </button>
        <button
          type="button"
          class="danger"
          class:armed={resetArmed}
          onclick={() => void resetLog()}
        >
          {resetArmed ? 'Tap again to delete every entry' : 'Reset log'}
        </button>
      </div>
      {#if resetArmed}
        <p class="warn" role="alert">
          This deletes every log entry on this device. There is no undo and no cloud copy — export
          first if you might want them.
        </p>
      {/if}
    </section>
  </div>

  <div class="col-secondary">
    <section class="card">
      <h2 class="section-title">About</h2>
      <p class="version tabular-nums">
        Sailflow v{VERSION} — <a href="{REPO}/CHANGELOG.md">what's new</a>
      </p>
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

    <section class="card">
      <h2 class="section-title">Improve Sailflow</h2>
      <p class="note first">
        What you have used, counted on this device and nowhere else. Sailflow has no server to send
        it to — nothing here is uploaded, ever.
      </p>
      <dl class="rows">
        {#each TELEMETRY_EVENTS.filter((e) => e !== 'view.kit') as event (event)}
          <dt>{TELEMETRY_LABELS[event]}</dt>
          <dd class="tabular-nums">{counts ? counts[event] : '—'}</dd>
        {/each}
      </dl>
      <div class="actions">
        <button type="button" class="quiet" onclick={exportUsage}>Export usage JSON</button>
        <button type="button" class="quiet" onclick={resetUsage}>Reset</button>
      </div>
      <p class="note">
        <a href={feedbackUrl({ route: router.route, version: VERSION })} rel="noopener noreferrer">
          This felt wrong →
        </a>
        opens a GitHub issue with the screen and version filled in. You see and edit everything before
        it is sent; no counters and no personal data are attached.
      </p>
    </section>
  </div>
</div>

<Toast message={toast} bind:open={toastOpen} />

<style>
  .note {
    margin: var(--space-3) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .note.first {
    margin-block-start: 0;
    margin-block-end: var(--space-3);
  }

  .note a {
    color: var(--accent);
  }

  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
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

  .data-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .warn {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--bad);
  }

  .danger {
    min-height: var(--hit-min);
    margin-block-start: var(--space-2);
    padding: 0 var(--space-3);
    border: 1px solid var(--bad);
    border-radius: var(--radius);
    background: transparent;
    color: var(--bad);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .danger.armed {
    background: var(--bad);
    color: var(--bg);
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

  .version a {
    color: var(--accent);
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

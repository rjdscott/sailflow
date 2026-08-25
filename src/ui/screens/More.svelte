<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import Segmented from '../components/Segmented.svelte';
  import DensityToggle from '../components/DensityToggle.svelte';
  import Toast from '../components/Toast.svelte';
  import Sheet from '../components/Sheet.svelte';
  import InstrumentCell from '../components/InstrumentCell.svelte';
  import { settings, type Motion, type Theme } from '../stores/settings.svelte';
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
  import { drills } from '../drills/store.svelte';
  import { GUIDE_LABELS, referenceStatus, type GuideId } from '../../lib/reference';

  const VERSION = import.meta.env.VITE_APP_VERSION;
  const REPO = 'https://github.com/rjdscott/sailflow/blob/main';

  /* Each document is its own chunk, fetched when the sheet opens (audit ux-03
     M-23): 48 KB of markdown — 13.8 KB gzip — was riding in the entry chunk
     for text nobody sees until they tap a link on the More tab. Still bundled
     rather than fetched from GitHub, so the service worker precaches them and
     they open on a dock with no signal (audit ux-02 M-22); the GitHub links
     stay for anyone who wants the rendered, linkable version. */
  const DOCS = [
    {
      id: 'provenance',
      title: 'Provenance',
      file: 'PROVENANCE.md',
      load: () => import('../../../PROVENANCE.md?raw'),
    },
    {
      id: 'assumptions',
      title: 'Assumptions',
      file: 'ASSUMPTIONS.md',
      load: () => import('../../../ASSUMPTIONS.md?raw'),
    },
    {
      id: 'validation',
      title: 'Validation report',
      file: 'validation/report.md',
      load: () => import('../../../validation/report.md?raw'),
    },
  ];

  /* `$state.raw`, not `$state`: a plain `$state` wraps the assigned DOCS entry
     in a proxy, so the `openDoc === doc` identity check below never matched
     and the sheet sat on "Loading…" forever. Nothing mutates the entry, so
     there is nothing for the proxy to be doing here anyway. */
  let openDoc: (typeof DOCS)[number] | null = $state.raw(null);
  let docOpen = $state(false);
  let docText = $state('');

  async function readInApp(doc: (typeof DOCS)[number]): Promise<void> {
    openDoc = doc;
    docText = '';
    docOpen = true;
    try {
      const { default: text } = await doc.load();
      // The reader may have closed this sheet, or opened another, while the
      // chunk was in flight; only the document still on screen gets the text.
      if (openDoc === doc) docText = text;
    } catch {
      if (openDoc === doc)
        docText = `Could not load ${doc.file}. It is on GitHub at\n${REPO}/${doc.file}`;
    }
  }

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

  /* Drill progress: the attempt history behind the medals, the streak and the
     spacing schedule (audit ux-02 L-02). Same export-then-reset pair, and the
     same two-tap arming, as the log and the usage counters. */
  let drillResetArmed = $state(false);

  async function exportDrills(): Promise<void> {
    download('sailflow-drills.json', await drills.exportHistory(), 'application/json');
    say('Drill history saved to your downloads.');
  }

  async function resetDrills(): Promise<void> {
    if (!drillResetArmed) {
      drillResetArmed = true;
      return;
    }
    drillResetArmed = false;
    await drills.resetHistory();
    say('Drill history reset — medals, streak and schedule cleared.');
  }
</script>

<TopBar title="More" />

<div class="screen more-screen">
  <div class="col-primary">
    <section class="card">
      <h2 class="section-title">About</h2>
      <p class="lead">
        A practice tool, not a measurement — every number tells you how much to trust it.
      </p>
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
        {#each DOCS as doc (doc.id)}
          <li>
            <button type="button" class="linkish" onclick={() => void readInApp(doc)}>
              {doc.title} — read here
            </button>
            <a href="{REPO}/{doc.file}" rel="noopener noreferrer">on GitHub</a>
          </li>
        {/each}
      </ul>
      <p class="note">The three documents are bundled with the app, so they open offline.</p>
    </section>

    <section class="card">
      <h2 class="section-title">Settings</h2>
      <div class="setting">
        <span>Density</span>
        <DensityToggle />
      </div>
      <p class="note first">
        Race adds the eleven-control panel, the per-wind-speed regret table, the model-vs-guides
        comparison and the tier-3 drills; Analyse is Race plus the comparison surfaces still being
        built. It applies everywhere, not just on this screen.
      </p>
      <div class="setting">
        <span>Theme</span>
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
      </div>
      <div class="setting">
        <span>Motion</span>
        <Segmented
          ariaLabel="Motion"
          options={[
            { value: 'system', label: 'System' },
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Reduced' },
          ]}
          value={settings.motion}
          onchange={(v: Motion) => settings.setMotion(v)}
        />
      </div>
      <p class="note">
        System follows your device's reduce-motion setting; the other two override it here.
      </p>
    </section>
  </div>

  <div class="col-secondary">
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
    <section class="card">
      <h2 class="section-title">Drill progress</h2>
      <!-- Two numbers, on the same cell contract as the cockpit (ADR 0015):
           the streak reads as an instrument here as it does on the drill card. -->
      <div class="cells">
        <InstrumentCell
          label="Streak"
          id="drillStreak"
          size="sm"
          value={String(drills.streak)}
          unit={drills.streak === 1 ? 'day' : 'days'}
        />
        <InstrumentCell
          label="Drills attempted"
          id="drillsAttempted"
          size="sm"
          value={String(Object.keys(drills.best).length)}
          unit="of {drills.templates.length}"
        />
      </div>
      <p class="note first">
        Every attempt, the medals, the streak and the spaced-repetition schedule live in this
        browser only. Nothing is uploaded and nothing follows you to another device — clearing site
        data clears all of it, so export first if it matters.
      </p>
      <div class="data-actions">
        <button type="button" class="quiet" onclick={() => void exportDrills()}>
          Export drill history
        </button>
        <button
          type="button"
          class="danger"
          class:armed={drillResetArmed}
          onclick={() => void resetDrills()}
        >
          {drillResetArmed ? 'Tap again to delete every attempt' : 'Reset drill progress'}
        </button>
      </div>
      {#if drillResetArmed}
        <p class="warn" role="alert">
          This deletes every drill attempt on this device, and with it the streak and the schedule.
          There is no undo.
        </p>
      {/if}
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

<Sheet bind:open={docOpen} title={openDoc?.title ?? ''}>
  <!-- Raw markdown, monospaced. A renderer is a dependency for three files
       nobody edits in the app; the source is legible as it is. -->
  {#if docText}
    <pre class="doc">{docText}</pre>
  {:else}
    <p class="doc-loading" role="status">Loading {openDoc?.file ?? 'document'}…</p>
  {/if}
</Sheet>

<Toast message={toast} bind:open={toastOpen} />

<style>
  /* Cockpit panels, not flat cards (ADR 0015): the settings groups are the
     same raised surface as the Race panels. */
  .more-screen :global(.card) {
    background: var(--surface-2);
  }

  .cells {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-3) var(--space-4);
  }

  .lead {
    margin: 0 0 var(--space-3);
    font-size: var(--text-md);
    color: var(--ink);
  }

  /* Density, theme and motion are the same kind of choice: one row shape,
     one right edge, wrapping rather than overflowing on a phone (research
     §3 principle 19, fixed positions). */
  .setting {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: var(--space-2) var(--space-3);
    min-height: var(--hit-min);
    padding-block: var(--space-2);
    font-size: var(--text-sm);
  }

  .linkish {
    padding: 0;
    border: none;
    background: none;
    color: var(--accent);
    font: inherit;
    text-align: start;
    cursor: pointer;
  }

  /* The sheet is the only scrolling surface on the screen; the document is
     long and must not push the page. */
  .doc-loading {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .doc {
    max-height: 60vh;
    overflow: auto;
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    line-height: 1.5;
    white-space: pre-wrap;
    color: var(--ink);
  }

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
    border: 1px solid var(--line-strong);
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

  .links li {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-height: var(--hit-min);
  }

  /* The provenance links are links, so they wear the one interactive colour
     rather than reading as disabled body text. */
  .links a {
    display: inline-flex;
    align-items: center;
    min-height: var(--hit-min);
    color: var(--accent);
    white-space: nowrap;
  }
</style>

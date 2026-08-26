<script lang="ts">
  import { onMount } from 'svelte';
  import TopBar from '../components/TopBar.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Toast from '../components/Toast.svelte';
  import CopyLink from '../components/CopyLink.svelte';
  import NumberField from '../log/NumberField.svelte';
  import { logStoreUi, type ImportPreview } from '../log/store.svelte';
  import {
    deltaLine,
    DOCK_KEYS,
    draftLabel,
    emptyRace,
    entryShare,
    outcomeLine,
    prefillEntry,
    RACE_KEYS,
    SPECS,
  } from '../log/logic';
  import { nextId, type LogEntry } from '../../lib/logStore';
  import type { RaceControls, SeaState } from '../../core/types';
  import { rigLock } from '../stores/rigLock.svelte';
  import { SEA_LABELS, windLine } from '../format';
  import { describeSetup } from '../dock/logic';

  const SEA_STATE_OPTIONS = ([0, 1, 2, 3, 4] as SeaState[]).map((v) => ({
    value: String(v),
    label: SEA_LABELS[v],
  }));

  /** Same clock the rig lock stamps its commit with, so "today" agrees. */
  const today = new Date().toISOString().slice(0, 10);

  let editorOpen = $state(false);
  let editingId: string | null = $state(null);
  let form: LogEntry = $state(prefillEntry({ today }));
  let includeRace = $state(false);
  let raceForm: RaceControls = $state(emptyRace());
  let deleteArmed = $state(false);
  let fileInputEl: HTMLInputElement | undefined = $state();
  let toastMessage = $state('');
  let toastOpen = $state(false);
  /** Parsed import waiting on merge/replace/cancel (audit ux-02 M-21). */
  let pendingImport: ImportPreview | null = $state.raw(null);
  let importOpen = $state(false);

  // ponytail: a media query decides this, not a resize handler — the editor is
  // a modal <dialog> below lg and an inline card above it, and no CSS makes a
  // modal dialog inline.
  let wide = $state(false);
  $effect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = (): void => {
      wide = mq.matches;
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  });

  onMount(() => {
    void logStoreUi.load();
  });

  function notify(message: string): void {
    toastMessage = message;
    toastOpen = true;
  }

  function loadForm(entry: LogEntry): void {
    // $state.snapshot deep-clones out of the proxy, structuredClone makes it
    // ours: the form must never alias a stored entry, the Dock draft, or the
    // committed rig (audit ux-02 H-06).
    form = structuredClone($state.snapshot(entry)) as LogEntry;
    includeRace = !!form.race;
    raceForm = form.race ? { ...form.race } : emptyRace();
    deleteArmed = false;
    editorOpen = true;
  }

  function openNew(): void {
    editingId = null;
    loadForm({
      ...prefillEntry({
        lock: rigLock.lockedToday ? rigLock.locked : null,
        last: logStoreUi.entries.find((e) => e.venue) ?? null,
        today,
      }),
      // Another screen may have handed us a partial entry (e.g. a trim to log).
      ...($state.snapshot(logStoreUi.draft) as Partial<LogEntry>),
    });
  }

  function openEdit(entry: LogEntry): void {
    editingId = entry.id;
    loadForm(entry);
  }

  function closeEditor(): void {
    editorOpen = false;
    editingId = null;
    logStoreUi.clearDraft();
  }

  /**
   * The link for the entry in the editor. Reads the form rather than the
   * stored row, so what is on screen is what gets shared; `includeRace` gates
   * the trim exactly as saving does, so a link never carries a trim the entry
   * would not.
   */
  const entryLink = $derived(
    entryShare({
      ...$state.snapshot(form),
      race: includeRace ? $state.snapshot(raceForm) : undefined,
    } as LogEntry),
  );

  async function handleSave(): Promise<void> {
    const entry: LogEntry = {
      ...$state.snapshot(form),
      v: 2,
      id: editingId ?? nextId(),
      // Going through the form is what finishes a Dock draft (ux-02 M-04).
      status: 'complete',
      createdAt: editingId ? form.createdAt : new Date().toISOString(),
      race: includeRace ? { ...$state.snapshot(raceForm) } : undefined,
    };
    const ok = editingId ? await logStoreUi.update(entry) : await logStoreUi.add(entry);
    // On failure the editor stays open with the typed entry, and the error
    // line above the list says what happened (ux-02 M-07).
    if (!ok) return;
    notify(editingId ? 'Entry updated' : 'Entry saved');
    closeEditor();
  }

  async function handleDeleteTap(): Promise<void> {
    if (!editingId) return;
    if (!deleteArmed) {
      deleteArmed = true;
      return;
    }
    if (!(await logStoreUi.remove(editingId))) return;
    notify('Entry deleted');
    closeEditor();
  }

  function triggerImport(): void {
    fileInputEl?.click();
  }

  async function handleImportFile(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    pendingImport = logStoreUi.parseImport(await file.text());
    importOpen = true;
  }

  async function runImport(mode: 'merge' | 'replace'): Promise<void> {
    if (!pendingImport) return;
    const summary = await logStoreUi.applyImport(pendingImport, mode);
    pendingImport = null;
    importOpen = false;
    if (logStoreUi.error) return;
    const skipped = summary.reasons.length ? `, ${summary.reasons.length} skipped` : '';
    const verb = mode === 'replace' ? 'Replaced with' : 'Imported';
    notify(`${verb} ${summary.added} ${summary.added === 1 ? 'entry' : 'entries'}${skipped}`);
  }
</script>

{#snippet editor()}
  <form
    onsubmit={(e) => {
      e.preventDefault();
      void handleSave();
    }}
  >
    <label class="field">
      <span>Date</span>
      <input type="date" bind:value={form.date} required />
    </label>

    <label class="field">
      <span>Venue</span>
      <input type="text" bind:value={form.venue} required />
    </label>

    <h3 class="section-title">Forecast</h3>
    <div class="row">
      <NumberField label="Min" bind:value={form.forecast.minKt} unit="kt" step={1} min={0} />
      <NumberField label="Likely" bind:value={form.forecast.likelyKt} unit="kt" step={1} min={0} />
      <NumberField label="Max" bind:value={form.forecast.maxKt} unit="kt" step={1} min={0} />
    </div>

    <h3 class="section-title">Actual</h3>
    <div class="row">
      <NumberField label="Min" bind:value={form.actual.minKt} unit="kt" step={1} min={0} />
      <NumberField label="Max" bind:value={form.actual.maxKt} unit="kt" step={1} min={0} />
    </div>

    <h3 class="section-title">Sea state</h3>
    <Segmented
      ariaLabel="Sea state"
      options={SEA_STATE_OPTIONS}
      value={String(form.seaState)}
      onchange={(v) => (form.seaState = Number(v) as SeaState)}
    />

    <div class="row">
      <NumberField label="Crew weight" bind:value={form.crewKg} unit="kg" step={1} min={0} />
    </div>

    <h3 class="section-title">Dock setup</h3>
    <div class="row">
      {#each DOCK_KEYS as key (key)}
        {@const spec = SPECS[key]}
        <NumberField
          label={spec.label}
          bind:value={() => form.dock[key], (v) => (form.dock[key] = v ?? 0)}
          unit={spec.unit}
          min={spec.min}
          max={spec.max}
          step={spec.step}
        />
      {/each}
    </div>

    <h3 class="section-title">Result</h3>
    <label class="field">
      <span>Result</span>
      <input type="text" bind:value={form.outcome.result} placeholder="3, 1, 7" />
    </label>
    <div class="row">
      <NumberField label="Placing" bind:value={form.outcome.placing} step={1} min={1} />
    </div>

    <details>
      <summary>Race settings (optional)</summary>
      <label class="field checkbox">
        <input type="checkbox" bind:checked={includeRace} />
        <span>Record race settings for this entry</span>
      </label>
      {#if includeRace}
        <div class="row">
          {#each RACE_KEYS as key (key)}
            {@const spec = SPECS[key]}
            <NumberField
              label={spec.label}
              bind:value={() => raceForm[key], (v) => (raceForm[key] = v ?? 0)}
              unit={spec.unit}
              min={spec.min}
              max={spec.max}
              step={spec.step}
            />
          {/each}
        </div>
      {/if}
    </details>

    <label class="field">
      <span>Notes</span>
      <textarea bind:value={form.notes} rows="3"></textarea>
    </label>

    <label class="field">
      <span>What was fast</span>
      <textarea bind:value={form.fast} rows="3"></textarea>
    </label>

    <div class="actions">
      <button type="submit" class="primary">Save</button>
      <button type="button" class="quiet" onclick={closeEditor}>Cancel</button>
      <!-- This entry as a link (ADR 0019): the wind, sea state, crew, rig and
           trim it recorded, opened on whichever screen can answer it. Built
           from the form's live values, so a link copied after an edit carries
           the edit whether or not it has been saved yet. -->
      <CopyLink
        route={entryLink.route}
        shareState={entryLink.state}
        label="Copy link"
        title="Copy a link that opens this entry's conditions, rig and trim in the app."
      />
      {#if editingId}
        <button type="button" class="danger" onclick={handleDeleteTap}>
          {deleteArmed ? 'Tap again to delete' : 'Delete'}
        </button>
      {/if}
    </div>
  </form>
{/snippet}

<TopBar title="Log" />

<div class="screen log-screen">
  <div class="col-primary">
    <div class="toolbar">
      <button type="button" class="new" onclick={openNew}>New entry</button>
      <span class="spacer"></span>
      <!-- Backup is a disclosure, not three peer buttons: on a phone they took
           the top third of the screen and Import (destructive) read the same
           as Export CSV (audit ux-02 M-23). -->
      <details class="backup">
        <summary>Backup</summary>
        <div class="backup-menu">
          {#if logStoreUi.entries.length > 0}
            <button type="button" class="quiet" onclick={() => logStoreUi.exportJson()}
              >Export JSON</button
            >
            <button type="button" class="quiet" onclick={() => logStoreUi.exportCsv()}
              >Export CSV</button
            >
          {/if}
          <button type="button" class="quiet" onclick={triggerImport}>Import a log file</button>
        </div>
      </details>
      <input
        bind:this={fileInputEl}
        type="file"
        accept=".json"
        class="visually-hidden"
        onchange={handleImportFile}
      />
    </div>

    {#if logStoreUi.error}
      <p class="error" role="alert">{logStoreUi.error}</p>
    {/if}

    {#if logStoreUi.entries.length === 0 && !logStoreUi.error}
      <section class="card empty">
        <h2 class="section-title">No entries yet</h2>
        <p>Record the wind, the rig you sailed and what was fast, while you still remember it.</p>
        <button type="button" class="new" onclick={openNew}>Start today's entry</button>
        <p class="sub">Or restore a log you exported before, under Backup.</p>
      </section>
    {:else}
      <ul class="entries">
        {#each logStoreUi.entries as entry (entry.id)}
          {@const draft = draftLabel(entry, today)}
          {@const delta = deltaLine(entry)}
          {@const outcome = outcomeLine(entry)}
          <li>
            <button
              type="button"
              class="card entry"
              class:selected={editingId === entry.id}
              class:draft
              onclick={() => openEdit(entry)}
            >
              <span class="entry-title">
                {#if draft}<span class="pill">{draft}</span>{/if}
                {entry.date} · {entry.venue || 'Unnamed venue'}
              </span>
              <span class="entry-wind tabular-nums">{windLine(entry)}</span>
              {#if delta}<span class="entry-line tabular-nums">{delta}</span>{/if}
              <span class="entry-line tabular-nums">{describeSetup(entry.dock)}</span>
              {#if outcome}<span class="outcome chip">{outcome}</span>{/if}
              {#if entry.notes}<span class="entry-notes">{entry.notes}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <!-- Not while the log is empty: the left column already says "No entries
       yet — start today's entry", and a second card beside it saying "Pick an
       entry to edit it" contradicted it, on a screen that was 85 % empty
       anyway (audit release-01 M-10). Once there is an entry, or the editor is
       open, the pane earns its column. -->
  {#if wide && (editorOpen || logStoreUi.entries.length > 0)}
    <div class="col-secondary">
      <section class="card">
        <h2 class="section-title">{editingId ? 'Edit entry' : 'New entry'}</h2>
        {#if editorOpen}
          {@render editor()}
        {:else}
          <p class="prompt">Pick an entry to edit it, or start a new one.</p>
        {/if}
      </section>
    </div>
  {/if}
</div>

{#if !wide}
  <Sheet bind:open={editorOpen} title={editingId ? 'Edit entry' : 'New entry'}>
    {@render editor()}
  </Sheet>
{/if}

<Sheet bind:open={importOpen} title="Import log">
  {#if pendingImport}
    <p class="import-count">
      This file has {pendingImport.entries.length}
      {pendingImport.entries.length === 1 ? 'entry' : 'entries'}{pendingImport.reasons.length
        ? `, and ${pendingImport.reasons.length} row${pendingImport.reasons.length === 1 ? '' : 's'} that cannot be read`
        : ''}. You have {logStoreUi.entries.length} now.
    </p>
    <div class="actions">
      <button type="button" class="primary" onclick={() => void runImport('merge')}>
        Merge into my log
      </button>
      <button type="button" class="danger" onclick={() => void runImport('replace')}>
        Replace my log
      </button>
      <button
        type="button"
        class="quiet"
        onclick={() => {
          pendingImport = null;
          importOpen = false;
        }}
      >
        Cancel
      </button>
    </div>
    <p class="sub">
      Merge keeps what you have and updates any entry with a matching id. Replace deletes every
      entry first.
    </p>
  {/if}
</Sheet>

<Toast bind:open={toastOpen} message={toastMessage} />

<style>
  /* Cockpit panels, not flat cards (ADR 0015): one rule reaches the entry
     rows and the editor card alike. */
  .log-screen :global(.card) {
    background: var(--surface-2);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
    /* The row sat flush on the card below it, where every other card on the
       screen has `--space-4` between it and its neighbour, so the two buttons
       read as fused to the card border (audit ux-03 L-04). */
    margin-bottom: var(--space-4);
  }

  .spacer {
    flex: 1;
  }

  .toolbar button,
  .backup summary {
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .backup summary {
    display: flex;
    align-items: center;
    border: 1px solid var(--line-strong);
    color: var(--ink-2);
  }

  .backup-menu {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-block-start: var(--space-2);
  }

  .new {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }

  .quiet {
    border: 1px solid var(--line-strong);
    background: transparent;
    color: var(--ink-2);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .error {
    margin: 0;
    padding: var(--space-3);
    border: 1px solid var(--bad);
    border-radius: var(--radius);
    color: var(--bad);
    font-size: var(--text-sm);
  }

  .empty p {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .empty .new {
    min-height: var(--hit-min);
    margin-block-start: var(--space-3);
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .sub {
    margin: var(--space-2) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .import-count {
    margin: 0 0 var(--space-3);
    font-size: var(--text-sm);
  }

  .entries {
    list-style: none;
    display: grid;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
  }

  .entry {
    display: grid;
    /* minmax(0,…) so the one-line ellipsis works instead of stretching the card */
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-1);
    width: 100%;
    text-align: start;
    color: var(--ink);
    cursor: pointer;
  }

  .entry.selected {
    border-color: var(--accent);
  }

  .entry.draft {
    border-color: var(--accent);
    border-style: dashed;
  }

  .pill {
    display: inline-block;
    margin-inline-end: var(--space-2);
    padding: 0 var(--space-2);
    border-radius: var(--radius);
    background: var(--accent);
    color: var(--on-accent);
    font-size: var(--text-xs);
    font-weight: 600;
    vertical-align: middle;
  }

  .entry-title {
    font-size: var(--text-md);
    font-weight: 600;
  }

  /* The wind is what you scan the list for, so it is the row's instrument
     line: one step up in size, tabular, full ink. */
  .entry-wind {
    font-size: var(--text-sm);
    color: var(--ink);
    white-space: nowrap;
  }

  /* Result as a chip, not a fourth grey line: it is the row's one outcome. */
  .outcome {
    justify-self: start;
    height: 24px;
    margin-block-start: var(--space-1);
    padding: 0 var(--space-2);
    font-size: var(--text-xs);
    background: transparent;
  }

  .entry-line,
  .entry-notes {
    font-size: var(--text-xs);
    color: var(--ink-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .entry-notes {
    font-style: italic;
  }

  .prompt {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  h3 {
    margin: var(--space-2) 0 0;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--text-sm);
    /* Form controls floor at their intrinsic width otherwise. */
    min-width: 0;
  }

  .field.checkbox {
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
  }

  /* Fields sit on --surface-2 with a --line-strong outline: the outline is
     what carries the field boundary at 3:1 (WCAG 1.4.11), so the fill can
     match the panel instead of punching a hole in it. */
  .field input,
  .field textarea {
    width: 100%;
    min-height: var(--hit-min);
    padding: var(--space-2);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface-2);
    color: var(--ink);
    font-size: var(--text-md);
  }

  .field.checkbox input {
    width: auto;
    min-height: 0;
  }

  /* auto-fit, not flex: three kt fields wrap to one column on a 390 px phone
     and sit in a row on desktop, with no page-level sideways scroll at any
     width (audit ux-02 H-05). */
  .row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
    gap: var(--space-2);
  }

  summary {
    min-height: var(--hit-min);
    display: flex;
    align-items: center;
    font-size: var(--text-sm);
    color: var(--ink-2);
    cursor: pointer;
  }

  .actions {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .actions button {
    flex: 1;
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .primary {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }

  .danger {
    border: 1px solid var(--bad);
    background: transparent;
    color: var(--bad);
  }
</style>

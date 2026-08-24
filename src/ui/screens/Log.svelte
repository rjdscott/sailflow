<script lang="ts">
  import '../_layout-fallback.css';
  import { onMount } from 'svelte';
  import TopBar from '../components/TopBar.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Toast from '../components/Toast.svelte';
  import NumberField from '../log/NumberField.svelte';
  import { logStoreUi } from '../log/store.svelte';
  import { nextId, type LogEntry } from '../../lib/logStore';
  import type { RaceControls, SeaState } from '../../core/types';
  import { SEA_LABELS, windLine } from '../format';
  import { describeSetup } from '../dock/logic';

  const SEA_STATE_OPTIONS = ([0, 1, 2, 3, 4] as SeaState[]).map((v) => ({
    value: String(v),
    label: SEA_LABELS[v],
  }));

  const RACE_FIELDS: { key: keyof RaceControls; label: string }[] = [
    { key: 'backstay', label: 'Backstay' },
    { key: 'mainsheet', label: 'Mainsheet' },
    { key: 'traveller', label: 'Traveller' },
    { key: 'cunningham', label: 'Cunningham' },
    { key: 'outhaul', label: 'Outhaul' },
    { key: 'vang', label: 'Vang' },
    { key: 'jibSheet', label: 'Jib sheet' },
    { key: 'jibLead', label: 'Jib lead' },
    { key: 'inhauler', label: 'Inhauler' },
    { key: 'mainHalyard', label: 'Main halyard' },
    { key: 'jibHalyard', label: 'Jib halyard' },
  ];

  function emptyEntry(): LogEntry {
    return {
      id: '',
      v: 1,
      date: new Date().toISOString().slice(0, 10),
      venue: '',
      forecast: { minKt: 0, likelyKt: 0, maxKt: 0 },
      actual: { minKt: 0, maxKt: 0 },
      seaState: 0,
      crewKg: 0,
      dock: { upperTurns: 0, lowerTurns: 0, forestayMm: 0 },
      race: undefined,
      notes: '',
      fast: '',
      createdAt: '',
    };
  }

  function emptyRace(): RaceControls {
    return {
      backstay: 0,
      mainsheet: 0,
      traveller: 0,
      cunningham: 0,
      outhaul: 0,
      vang: 0,
      jibSheet: 0,
      jibLead: 0,
      inhauler: 0,
      mainHalyard: 0,
      jibHalyard: 0,
    };
  }

  let editorOpen = $state(false);
  let editingId: string | null = $state(null);
  let form: LogEntry = $state(emptyEntry());
  let includeRace = $state(false);
  let raceForm: RaceControls = $state(emptyRace());
  let deleteArmed = $state(false);
  let fileInputEl: HTMLInputElement | undefined = $state();
  let toastMessage = $state('');
  let toastOpen = $state(false);

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

  function openNew(): void {
    editingId = null;
    form = { ...emptyEntry(), ...logStoreUi.draft };
    includeRace = !!form.race;
    raceForm = form.race ? { ...form.race } : emptyRace();
    deleteArmed = false;
    editorOpen = true;
  }

  function openEdit(entry: LogEntry): void {
    editingId = entry.id;
    form = { ...entry };
    includeRace = !!entry.race;
    raceForm = entry.race ? { ...entry.race } : emptyRace();
    deleteArmed = false;
    editorOpen = true;
  }

  function closeEditor(): void {
    editorOpen = false;
    editingId = null;
    logStoreUi.clearDraft();
  }

  async function handleSave(): Promise<void> {
    const entry: LogEntry = {
      ...form,
      v: 1,
      id: editingId ?? nextId(),
      createdAt: editingId ? form.createdAt : new Date().toISOString(),
      race: includeRace ? { ...raceForm } : undefined,
    };
    if (editingId) {
      await logStoreUi.update(entry);
      notify('Entry updated');
    } else {
      await logStoreUi.add(entry);
      notify('Entry saved');
    }
    closeEditor();
  }

  async function handleDeleteTap(): Promise<void> {
    if (!editingId) return;
    if (!deleteArmed) {
      deleteArmed = true;
      return;
    }
    await logStoreUi.remove(editingId);
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
    const text = await file.text();
    const summary = await logStoreUi.import(text);
    const skipped = summary.reasons.length ? `, ${summary.reasons.length} skipped` : '';
    notify(`Imported ${summary.added} ${summary.added === 1 ? 'entry' : 'entries'}${skipped}`);
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
      <NumberField label="Min" bind:value={form.forecast.minKt} unit="kt" />
      <NumberField label="Likely" bind:value={form.forecast.likelyKt} unit="kt" />
      <NumberField label="Max" bind:value={form.forecast.maxKt} unit="kt" />
    </div>

    <h3 class="section-title">Actual</h3>
    <div class="row">
      <NumberField label="Min" bind:value={form.actual.minKt} unit="kt" />
      <NumberField label="Max" bind:value={form.actual.maxKt} unit="kt" />
    </div>

    <h3 class="section-title">Sea state</h3>
    <Segmented
      ariaLabel="Sea state"
      options={SEA_STATE_OPTIONS}
      value={String(form.seaState)}
      onchange={(v) => (form.seaState = Number(v) as SeaState)}
    />

    <div class="row">
      <NumberField label="Crew weight" bind:value={form.crewKg} unit="kg" step={1} />
    </div>

    <h3 class="section-title">Dock setup</h3>
    <div class="row">
      <NumberField label="Upper" bind:value={form.dock.upperTurns} unit="turns" step={0.5} />
      <NumberField label="Lower" bind:value={form.dock.lowerTurns} unit="turns" step={0.5} />
      <NumberField label="Forestay" bind:value={form.dock.forestayMm} unit="mm" step={1} />
    </div>

    <details>
      <summary>Race settings (optional)</summary>
      <label class="field checkbox">
        <input type="checkbox" bind:checked={includeRace} />
        <span>Record race settings for this entry</span>
      </label>
      {#if includeRace}
        <div class="row wrap">
          {#each RACE_FIELDS as f (f.key)}
            <NumberField label={f.label} bind:value={raceForm[f.key]} />
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
      {#if editingId}
        <button type="button" class="danger" onclick={handleDeleteTap}>
          {deleteArmed ? 'Tap again to delete' : 'Delete'}
        </button>
      {/if}
    </div>
  </form>
{/snippet}

<TopBar title="Log" />

<div class="screen">
  <div class="col-primary">
    <div class="toolbar">
      <button type="button" class="new" onclick={openNew}>New entry</button>
      <span class="spacer"></span>
      <button type="button" class="quiet" onclick={() => logStoreUi.exportJson()}
        >Export JSON</button
      >
      <button type="button" class="quiet" onclick={() => logStoreUi.exportCsv()}>Export CSV</button>
      <button type="button" class="quiet" onclick={triggerImport}>Import</button>
      <input
        bind:this={fileInputEl}
        type="file"
        accept=".json"
        class="visually-hidden"
        onchange={handleImportFile}
      />
    </div>

    {#if logStoreUi.entries.length === 0}
      <section class="card empty">
        <h2 class="section-title">No entries yet</h2>
        <p>Record the wind, the rig you sailed and what was fast, while you still remember it.</p>
      </section>
    {:else}
      <ul class="entries">
        {#each logStoreUi.entries as entry (entry.id)}
          <li>
            <button
              type="button"
              class="card entry"
              class:selected={editingId === entry.id}
              onclick={() => openEdit(entry)}
            >
              <span class="entry-title">
                {entry.date} · {entry.venue || 'Unnamed venue'}
              </span>
              <span class="entry-line tabular-nums">{windLine(entry)}</span>
              <span class="entry-line tabular-nums">{describeSetup(entry.dock)}</span>
              {#if entry.notes}<span class="entry-notes">{entry.notes}</span>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  {#if wide}
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

<Toast bind:open={toastOpen} message={toastMessage} />

<style>
  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .spacer {
    flex: 1;
  }

  .toolbar button {
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border-radius: var(--radius);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .new {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }

  .quiet {
    border: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
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

  .empty p {
    margin: 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
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

  .entry-title {
    font-size: var(--text-md);
    font-weight: 600;
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
  }

  .field.checkbox {
    flex-direction: row;
    align-items: center;
    gap: var(--space-2);
    min-height: var(--hit-min);
  }

  .field input,
  .field textarea {
    min-height: var(--hit-min);
    padding: var(--space-2);
    border: 1px solid var(--line, color-mix(in srgb, var(--ink-2) 25%, transparent));
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    font-size: var(--text-md);
  }

  .field.checkbox input {
    min-height: 0;
  }

  .row {
    display: flex;
    gap: var(--space-2);
  }

  .row.wrap {
    flex-wrap: wrap;
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

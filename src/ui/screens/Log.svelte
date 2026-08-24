<script lang="ts">
  import { onMount } from 'svelte';
  import TopBar from '../components/TopBar.svelte';
  import Segmented from '../components/Segmented.svelte';
  import Sheet from '../components/Sheet.svelte';
  import Toast from '../components/Toast.svelte';
  import NumberField from '../log/NumberField.svelte';
  import { logStoreUi } from '../log/store.svelte';
  import { nextId, type LogEntry } from '../../lib/logStore';
  import type { RaceControls, SeaState } from '../../core/types';
  import { fmt } from '../format';

  const SEA_STATE_LABELS: Record<SeaState, string> = {
    0: 'flat',
    1: 'ripple',
    2: 'chop',
    3: 'steep',
    4: 'waves',
  };

  const SEA_STATE_OPTIONS = ([0, 1, 2, 3, 4] as SeaState[]).map((v) => ({
    value: String(v),
    label: SEA_STATE_LABELS[v],
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

  let sheetOpen = $state(false);
  let editingId: string | null = $state(null);
  let form: LogEntry = $state(emptyEntry());
  let includeRace = $state(false);
  let raceForm: RaceControls = $state(emptyRace());
  let deleteArmed = $state(false);
  let fileInputEl: HTMLInputElement | undefined = $state();
  let toastMessage = $state('');
  let toastOpen = $state(false);

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
    sheetOpen = true;
  }

  function openEdit(entry: LogEntry): void {
    editingId = entry.id;
    form = { ...entry };
    includeRace = !!entry.race;
    raceForm = entry.race ? { ...entry.race } : emptyRace();
    deleteArmed = false;
    sheetOpen = true;
  }

  function closeSheet(): void {
    sheetOpen = false;
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
    closeSheet();
  }

  async function handleDeleteTap(): Promise<void> {
    if (!editingId) return;
    if (!deleteArmed) {
      deleteArmed = true;
      return;
    }
    await logStoreUi.remove(editingId);
    notify('Entry deleted');
    closeSheet();
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

<TopBar title="Log" />

<div class="toolbar">
  <button type="button" onclick={() => logStoreUi.exportJson()}>Export JSON</button>
  <button type="button" onclick={() => logStoreUi.exportCsv()}>Export CSV</button>
  <button type="button" onclick={triggerImport}>Import</button>
  <input
    bind:this={fileInputEl}
    type="file"
    accept=".json"
    class="visually-hidden"
    onchange={handleImportFile}
  />
</div>

{#if logStoreUi.entries.length === 0}
  <p class="empty">No entries yet. Tap "+ entry" after your next sail to start the log.</p>
{:else}
  <ul class="entries">
    {#each logStoreUi.entries as entry (entry.id)}
      <li>
        <button type="button" class="entry-row" onclick={() => openEdit(entry)}>
          <span class="venue">{entry.venue || 'Unnamed venue'}</span>
          <span class="meta">{entry.date}</span>
          <span class="meta">
            {fmt(entry.actual.minKt, 0)}&ndash;{fmt(entry.actual.maxKt, 0)} kt
          </span>
          <span class="chip">{SEA_STATE_LABELS[entry.seaState]}</span>
        </button>
      </li>
    {/each}
  </ul>
{/if}

<button type="button" class="fab" onclick={openNew} aria-label="Add log entry">+ entry</button>

<Sheet bind:open={sheetOpen} title={editingId ? 'Edit entry' : 'New entry'}>
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

    <h3>Forecast</h3>
    <div class="row">
      <NumberField label="Min" bind:value={form.forecast.minKt} unit="kt" />
      <NumberField label="Likely" bind:value={form.forecast.likelyKt} unit="kt" />
      <NumberField label="Max" bind:value={form.forecast.maxKt} unit="kt" />
    </div>

    <h3>Actual</h3>
    <div class="row">
      <NumberField label="Min" bind:value={form.actual.minKt} unit="kt" />
      <NumberField label="Max" bind:value={form.actual.maxKt} unit="kt" />
    </div>

    <h3>Sea state</h3>
    <Segmented
      ariaLabel="Sea state"
      options={SEA_STATE_OPTIONS}
      value={String(form.seaState)}
      onchange={(v) => (form.seaState = Number(v) as SeaState)}
    />

    <div class="row">
      <NumberField label="Crew weight" bind:value={form.crewKg} unit="kg" step={1} />
    </div>

    <h3>Dock setup</h3>
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
      {#if editingId}
        <button type="button" class="danger" onclick={handleDeleteTap}>
          {deleteArmed ? 'Tap again to delete' : 'Delete'}
        </button>
      {/if}
    </div>
  </form>
</Sheet>

<Toast bind:open={toastOpen} message={toastMessage} />

<style>
  .toolbar {
    display: flex;
    gap: var(--space-2);
    flex-wrap: wrap;
    padding-block: var(--space-2);
  }

  .toolbar button {
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--surface);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
  }

  .empty {
    padding-block: var(--space-6);
    color: var(--ink-2);
    font-size: var(--text-sm);
  }

  .entries {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .entry-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    width: 100%;
    min-height: var(--hit-min);
    padding: var(--space-2) 0;
    border: none;
    border-bottom: 1px solid var(--surface);
    background: none;
    color: var(--ink);
    font-size: var(--text-sm);
    text-align: left;
    cursor: pointer;
  }

  .venue {
    flex: 1;
    font-weight: 600;
  }

  .meta {
    color: var(--ink-2);
  }

  .chip {
    padding: 2px var(--space-2);
    border-radius: var(--radius);
    background: var(--surface);
    color: var(--ink-2);
    font-size: var(--text-xs);
  }

  .fab {
    position: fixed;
    right: var(--space-4);
    bottom: calc(56px + var(--space-4) + env(safe-area-inset-bottom));
    min-width: var(--hit-min);
    min-height: var(--hit-min);
    padding: 0 var(--space-4);
    border: none;
    border-radius: 999px;
    background: var(--accent);
    color: var(--on-accent);
    font-size: var(--text-sm);
    font-weight: 600;
    box-shadow: 0 2px 8px rgb(0 0 0 / 0.25);
    cursor: pointer;
    z-index: 5;
  }

  form {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  h3 {
    margin: var(--space-2) 0 0;
    font-size: var(--text-sm);
    color: var(--ink-2);
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

  input[type='date'],
  input[type='text'],
  textarea {
    min-height: var(--hit-min);
    padding: var(--space-2);
    border: 1px solid var(--surface);
    border-radius: var(--radius);
    background: var(--bg);
    color: var(--ink);
    font-size: var(--text-md);
    font-family: inherit;
  }

  .row {
    display: flex;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .row > :global(*) {
    flex: 1;
    min-width: 100px;
  }

  details {
    border: 1px solid var(--surface);
    border-radius: var(--radius);
    padding: var(--space-2) var(--space-3);
  }

  summary {
    cursor: pointer;
    font-size: var(--text-sm);
    color: var(--ink-2);
  }

  .actions {
    display: flex;
    gap: var(--space-3);
    padding-top: var(--space-2);
  }

  .actions button {
    flex: 1;
    min-height: var(--hit-min);
    border-radius: var(--radius);
    border: none;
    font-size: var(--text-md);
    cursor: pointer;
  }

  .primary {
    background: var(--accent);
    color: var(--on-accent);
  }

  .danger {
    background: var(--bad);
    color: var(--on-accent);
  }
</style>

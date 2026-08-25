<script lang="ts">
  import Segmented from './Segmented.svelte';
  import { settings, type Mode } from '../stores/settings.svelte';
</script>

<Segmented
  ariaLabel="Density"
  options={[
    { value: 'learn', label: 'Learn' },
    { value: 'race', label: 'Race' },
    { value: 'analyse', label: 'Analyse' },
  ]}
  value={settings.mode}
  onchange={(v: Mode) => settings.setMode(v)}
/>

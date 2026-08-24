<script lang="ts">
  import Segmented from './Segmented.svelte';
  import { settings } from '../stores/settings.svelte';
</script>

<Segmented
  ariaLabel="Simple or Advanced mode"
  options={[
    { value: 'simple', label: 'Simple' },
    { value: 'advanced', label: 'Advanced' },
  ]}
  value={settings.mode}
  onchange={(v) => settings.setMode(v)}
/>

<script lang="ts">
  import TopBar from '../components/TopBar.svelte';
  import Segmented from '../components/Segmented.svelte';
  import { settings, type Theme } from '../stores/settings.svelte';

  const VERSION = import.meta.env.VITE_APP_VERSION;
</script>

<TopBar title="More" />

<section>
  <h2>Theme</h2>
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
</section>

<section>
  <p class="note">
    Animation is reduced automatically when your system's "reduce motion" setting is on.
  </p>
</section>

<section>
  <h2>Reference data</h2>
  <p>Reference data: North Rev 1015, Quantum 2020, ORC Speed Guide 2012</p>
</section>

<footer>
  <p class="note">Sailflow v{VERSION}</p>
</footer>

<style>
  section {
    padding-block: var(--space-3);
  }

  h2 {
    font-size: var(--text-sm);
    color: var(--ink-2);
    margin: 0 0 var(--space-2);
  }

  .note {
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>

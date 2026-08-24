import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

// ponytail: reload-on-update is the whole UX; a richer "update available"
// toast can replace this confirm() if it ever feels too abrupt.
// Guarded because this module only runs in a real browser — SSR/tests never
// import main.ts, but `PROD` still gates it so `pnpm dev` skips SW churn.
if (import.meta.env.PROD) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => {
      registerSW({
        onNeedRefresh() {
          if (confirm('A new version of Sailflow is available. Reload now?')) {
            location.reload();
          }
        },
      });
    })
    .catch((err: unknown) => console.warn('PWA registration failed', err));
}

export default app;

import { mount } from 'svelte';
import App from './App.svelte';

const app = mount(App, {
  target: document.getElementById('app')!,
});

// Service-worker registration and the "update available" toast live in
// App.svelte (audit ux-02 L-04), next to the component that renders the toast.

export default app;

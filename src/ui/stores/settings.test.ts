import { beforeEach, describe, expect, it, vi } from 'vitest';

function mockLocalStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  });
  return store;
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('settings store', () => {
  it('defaults to the race tier and dark theme with no stored value', async () => {
    mockLocalStorage();
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('race');
    expect(settings.theme).toBe('dark');
  });

  it('reads a previously stored mode and theme', async () => {
    mockLocalStorage({ 'sailflow.mode': 'analyse', 'sailflow.theme': 'dark' });
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('analyse');
    expect(settings.theme).toBe('dark');
  });

  it('ignores a garbage stored value and falls back to the default', async () => {
    mockLocalStorage({ 'sailflow.mode': 'nonsense' });
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('race');
  });

  it('persists writes through setMode/setTheme', async () => {
    const store = mockLocalStorage();
    const { settings } = await import('./settings.svelte');
    settings.setMode('analyse');
    settings.setTheme('light');
    expect(store.get('sailflow.mode')).toBe('analyse');
    expect(store.get('sailflow.theme')).toBe('light');
    expect(settings.mode).toBe('analyse');
    expect(settings.theme).toBe('light');
  });

  it('does not throw when localStorage access throws (private mode etc.)', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('race');
    expect(() => settings.setMode('learn')).not.toThrow();
  });

  // --- v1 Simple/Advanced -> density tiers --------------------------------

  it('migrates a stored "simple" to learn and writes the new name back', async () => {
    const store = mockLocalStorage({ 'sailflow.mode': 'simple' });
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('learn');
    expect(store.get('sailflow.mode')).toBe('learn');
  });

  it('migrates a stored "advanced" to race and writes the new name back', async () => {
    const store = mockLocalStorage({ 'sailflow.mode': 'advanced' });
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('race');
    expect(store.get('sailflow.mode')).toBe('race');
  });

  it('does not write anything back when there was nothing stored', async () => {
    const store = mockLocalStorage();
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('race');
    expect(store.has('sailflow.mode')).toBe(false);
  });

  it('exposes `advanced` for the two dense tiers only', async () => {
    mockLocalStorage();
    const { settings } = await import('./settings.svelte');
    settings.setMode('learn');
    expect(settings.advanced).toBe(false);
    settings.setMode('race');
    expect(settings.advanced).toBe(true);
    settings.setMode('analyse');
    expect(settings.advanced).toBe(true);
  });
});

/**
 * The first-run tour is shown to a first-run visitor and to nobody else, so
 * the only thing that matters is that a dismissal survives a reload — a tour
 * that reappears on every visit is worse than no tour.
 */
describe('first-run tour flag', () => {
  it('is unseen with nothing stored, so the tour opens', async () => {
    mockLocalStorage();
    const { settings } = await import('./settings.svelte');
    expect(settings.tourSeen).toBe(false);
    const { tour } = await import('../onboarding/tour.svelte');
    expect(tour.open).toBe(true);
  });

  it('stays dismissed once it has been dismissed', async () => {
    const store = mockLocalStorage();
    const { settings } = await import('./settings.svelte');
    settings.setTourSeen(true);
    expect(store.get('sailflow.tourSeen')).toBe('1');

    // A fresh module graph is the next page load.
    vi.resetModules();
    const reloaded = await import('./settings.svelte');
    expect(reloaded.settings.tourSeen).toBe(true);
    const { tour } = await import('../onboarding/tour.svelte');
    expect(tour.open).toBe(false);
  });
});

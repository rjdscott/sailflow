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
  it('defaults to simple mode and auto theme with no stored value', async () => {
    mockLocalStorage();
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('simple');
    expect(settings.theme).toBe('auto');
  });

  it('reads a previously stored mode and theme', async () => {
    mockLocalStorage({ 'sailflow.mode': 'advanced', 'sailflow.theme': 'dark' });
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('advanced');
    expect(settings.theme).toBe('dark');
  });

  it('ignores a garbage stored value and falls back to the default', async () => {
    mockLocalStorage({ 'sailflow.mode': 'nonsense' });
    const { settings } = await import('./settings.svelte');
    expect(settings.mode).toBe('simple');
  });

  it('persists writes through setMode/setTheme', async () => {
    const store = mockLocalStorage();
    const { settings } = await import('./settings.svelte');
    settings.setMode('advanced');
    settings.setTheme('light');
    expect(store.get('sailflow.mode')).toBe('advanced');
    expect(store.get('sailflow.theme')).toBe('light');
    expect(settings.mode).toBe('advanced');
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
    expect(settings.mode).toBe('simple');
    expect(() => settings.setMode('advanced')).not.toThrow();
  });
});

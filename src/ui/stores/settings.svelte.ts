/**
 * Persisted UI settings: Simple/Advanced mode, theme. localStorage access is
 * wrapped in try/catch — iOS Safari PWAs can throw in private contexts.
 */

export type Mode = 'simple' | 'advanced';
export type Theme = 'auto' | 'light' | 'dark';

const MODE_KEY = 'sailflow.mode';
const THEME_KEY = 'sailflow.theme';

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore: no persistence available (private mode, quota, etc.)
  }
}

function isMode(v: string | null): v is Mode {
  return v === 'simple' || v === 'advanced';
}

function isTheme(v: string | null): v is Theme {
  return v === 'auto' || v === 'light' || v === 'dark';
}

const initialMode = readStorage(MODE_KEY);
const initialTheme = readStorage(THEME_KEY);

class Settings {
  mode: Mode = $state(isMode(initialMode) ? initialMode : 'simple');
  theme: Theme = $state(isTheme(initialTheme) ? initialTheme : 'auto');

  setMode(mode: Mode): void {
    this.mode = mode;
    writeStorage(MODE_KEY, mode);
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    writeStorage(THEME_KEY, theme);
  }
}

export const settings = new Settings();

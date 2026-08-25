/**
 * Persisted UI settings: density tier, theme, motion. localStorage access is
 * wrapped in try/catch — iOS Safari PWAs can throw in private contexts.
 */

/**
 * Density tier (cockpit phase 01, replaces Simple/Advanced):
 *   learn    the five gears and the plain-language explanations
 *   race     the full control set, at a glance — the default
 *   analyse  race plus the comparison surfaces (nothing extra yet)
 */
export type Mode = 'learn' | 'race' | 'analyse';
export type Theme = 'auto' | 'light' | 'dark';
/** `system` follows `prefers-reduced-motion`; `on`/`off` override it (L-03). */
export type Motion = 'system' | 'on' | 'off';

const MODE_KEY = 'sailflow.mode';
const THEME_KEY = 'sailflow.theme';
const MOTION_KEY = 'sailflow.motion';

const DEFAULT_MODE: Mode = 'race';

/** Pre-cockpit values, still in the localStorage of everyone who used v1. */
const LEGACY_MODES: Record<string, Mode> = { simple: 'learn', advanced: 'race' };

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
  return v === 'learn' || v === 'race' || v === 'analyse';
}

function isTheme(v: string | null): v is Theme {
  return v === 'auto' || v === 'light' || v === 'dark';
}

function isMotion(v: string | null): v is Motion {
  return v === 'system' || v === 'on' || v === 'off';
}

/**
 * The stored tier, migrating a v1 Simple/Advanced value on the way through
 * and writing the new name back, so the migration runs exactly once per
 * browser rather than on every read.
 */
function readMode(): Mode {
  const stored = readStorage(MODE_KEY);
  if (isMode(stored)) return stored;
  const migrated = stored === null ? undefined : LEGACY_MODES[stored];
  if (migrated) {
    writeStorage(MODE_KEY, migrated);
    return migrated;
  }
  return DEFAULT_MODE;
}

const initialTheme = readStorage(THEME_KEY);
const initialMotion = readStorage(MOTION_KEY);

class Settings {
  mode: Mode = $state(readMode());
  theme: Theme = $state(isTheme(initialTheme) ? initialTheme : 'auto');
  motion: Motion = $state(isMotion(initialMotion) ? initialMotion : 'system');

  /**
   * "Show the dense version": true for race and analyse, false for learn.
   * The screens ask this rather than naming a tier, so adding a fourth tier
   * is one line here instead of a grep across five components.
   */
  get advanced(): boolean {
    return this.mode !== 'learn';
  }

  setMode(mode: Mode): void {
    this.mode = mode;
    writeStorage(MODE_KEY, mode);
  }

  setTheme(theme: Theme): void {
    this.theme = theme;
    writeStorage(THEME_KEY, theme);
  }

  setMotion(motion: Motion): void {
    this.motion = motion;
    writeStorage(MOTION_KEY, motion);
  }
}

export const settings = new Settings();

/**
 * "Has the reader asked for less motion?" — the app's own Motion setting
 * first, the OS one when it says `system` (audit ux-02 L-03).
 *
 * CSS gets this for free through `data-motion` on `<html>` (`tokens.css`); a
 * JS tween never sees that attribute and has to ask. Both tweens on the
 * Simulator call this — the instrument band's three numbers and the cockpit's
 * apply-optimum — because they had drifted apart: the band read the setting
 * and the apply animation read only `prefersReducedMotion`, so Motion `off`
 * still animated eleven sliders (phase 01 progress log, phase 05).
 *
 * A module of its own rather than a method on `settings`: `svelte/motion`
 * builds its `MediaQuery` on import, which needs a `window`, and the settings
 * store is imported by modules that run under plain Node in vitest.
 */
import { prefersReducedMotion } from 'svelte/motion';
import { settings } from './stores/settings.svelte';

export function reduceMotion(): boolean {
  return settings.motion === 'off' || (settings.motion !== 'on' && prefersReducedMotion.current);
}

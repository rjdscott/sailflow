/**
 * The five primary destinations, shared by the phone tab bar and the desktop
 * rail so the two can never drift apart. Icons are 24×24 stroke paths.
 */
import type { Route } from '../router.svelte';

export interface NavItem {
  route: Route;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { route: 'race', label: 'Race', icon: 'M4 18 L12 4 L20 18 L12 14 Z' },
  { route: 'dock', label: 'Dock', icon: 'M3 20 L21 20 M6 20 V8 L18 8 V20 M9 8 V4 H15 V8' },
  { route: 'log', label: 'Log', icon: 'M5 3 H19 V21 L12 18 L5 21 Z' },
  { route: 'drills', label: 'Drills', icon: 'M12 3 V21 M5 8 H19 M5 16 H19' },
  { route: 'more', label: 'More', icon: 'M5 12 H5.01 M12 12 H12.01 M19 12 H19.01' },
];

/**
 * The four primary destinations, shared by the phone tab bar and the desktop
 * rail so the two can never drift apart. Icons are 24×24 stroke paths.
 */
import { buildHash, type Route } from '../router.svelte';

export interface NavItem {
  route: Route;
  label: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  // The Race triangle, kept: Dock folded into this screen (ADR 0021) and the
  // sail outline is the one people already reach for.
  { route: 'sim', label: 'Simulator', icon: 'M4 18 L12 4 L20 18 L12 14 Z' },
  { route: 'log', label: 'Log', icon: 'M5 3 H19 V21 L12 18 L5 21 Z' },
  { route: 'drills', label: 'Drills', icon: 'M12 3 V21 M5 8 H19 M5 16 H19' },
  { route: 'more', label: 'More', icon: 'M5 12 H5.01 M12 12 H12.01 M19 12 H19.01' },
];

export interface NavLink extends NavItem {
  /** `#/log` — a real URL, so the rail is middle-clickable and copyable. */
  href: string;
  current: boolean;
}

/**
 * The nav as links rather than buttons (cockpit phase 06). Pure, so the shape
 * of the shell's markup is testable without mounting a component.
 */
export function navItems(current: Route): NavLink[] {
  return NAV_ITEMS.map((item) => ({
    ...item,
    href: buildHash(item.route),
    current: item.route === current,
  }));
}

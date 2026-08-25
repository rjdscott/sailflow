import { describe, expect, it } from 'vitest';
import { NAV_ITEMS, navItems } from './navItems';

describe('navItems', () => {
  it('gives every destination a real hash href', () => {
    expect(navItems('race').map((i) => i.href)).toEqual([
      '#/race',
      '#/dock',
      '#/log',
      '#/drills',
      '#/more',
    ]);
  });

  it('marks exactly the current route, so aria-current lands once', () => {
    const items = navItems('drills');
    expect(items.filter((i) => i.current).map((i) => i.route)).toEqual(['drills']);
  });

  it('keeps the rail and the tab bar on the same list', () => {
    expect(navItems('more').map((i) => i.route)).toEqual(NAV_ITEMS.map((i) => i.route));
  });
});

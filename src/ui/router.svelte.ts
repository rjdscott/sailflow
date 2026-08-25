/**
 * Hash router v2 (audit ux-02 M-05, M-14, L-01).
 *
 * Still no dependency: six screens, one optional pair of path segments and a
 * query string do not need a routing library. A hash is `#/<screen>` plus
 * either `/<a>/<b>` (drills: template id, seed) or `?k=v` (race: the whole
 * scenario), and `parseHash` returns both as one `{ screen, params }` object.
 * `buildHash` is its inverse, so a scenario round-trips through the URL.
 */

import { track } from '../lib/telemetry';

export const ROUTES = ['race', 'dock', 'log', 'drills', 'more', 'kit'] as const;
export type Route = (typeof ROUTES)[number];

export const DEFAULT_ROUTE: Route = 'race';

/** Browser-tab title per screen. "Race · Sailflow", so history reads. */
export const TITLES: Record<Route, string> = {
  race: 'Race',
  dock: 'Dock',
  log: 'Log',
  drills: 'Drills',
  more: 'More',
  kit: 'Kit',
};

/**
 * `kit` is a design-system scratch screen with invented numbers, so it is not
 * part of the app a visitor can navigate to: dev builds always, production
 * only when the query string opts in with `?kit=1`.
 *
 * The opt-in exists for the Playwright layout smoke (`tests/ui/kit.spec.ts`),
 * which runs against a real `pnpm build` — the gallery is the one screen that
 * puts every primitive on the page at once, so it is where a horizontal
 * overflow shows up first. `?kit=1` (not the hash) because the hash is the
 * router's own namespace. Kit is still a dynamic import in App.svelte, so a
 * normal production visit never fetches the chunk.
 */
export const KIT_ENABLED: boolean =
  import.meta.env.DEV || (typeof location !== 'undefined' && location.search.includes('kit=1'));

const LIVE_ROUTES: readonly string[] = KIT_ENABLED ? ROUTES : ROUTES.filter((r) => r !== 'kit');

export type Params = Record<string, string>;

export interface ParsedRoute {
  screen: Route;
  /**
   * Query params, plus `template`/`seed` lifted out of the drills path so a
   * consumer reads one flat bag whichever form the link used.
   */
  params: Params;
}

export function parseHash(hash: string): ParsedRoute {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const segments = path.split('/').filter(Boolean);
  const slug = segments[0] ?? '';
  const known = LIVE_ROUTES.includes(slug);
  if (slug && !known) console.warn(`Sailflow: no screen called "${slug}" — showing Race.`);
  const screen = known ? (slug as Route) : DEFAULT_ROUTE;

  const params: Params = Object.fromEntries(new URLSearchParams(query));
  if (screen === 'drills' && known) {
    if (segments[1]) params.template = segments[1];
    if (segments[2]) params.seed = segments[2];
  }
  return { screen, params };
}

export function buildHash(screen: Route, params: Params = {}): string {
  const { template, seed, ...query } = params;
  let out = `#/${screen}`;
  if (screen === 'drills' && template) out += seed ? `/${template}/${seed}` : `/${template}`;
  const search = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== '')).toString();
  return search ? `${out}?${search}` : out;
}

function currentHash(): string {
  return typeof location !== 'undefined' ? location.hash : '';
}

class Router {
  route: Route = $state(DEFAULT_ROUTE);
  params: Params = $state.raw({});

  constructor() {
    const initial = parseHash(currentHash());
    this.route = initial.screen;
    this.params = initial.params;
    if (typeof window !== 'undefined') {
      track(`view.${this.route}`);
      this.#title();
      window.addEventListener('hashchange', () => {
        const next = parseHash(currentHash());
        this.params = next.params;
        if (next.screen === this.route) return;
        this.route = next.screen;
        track(`view.${next.screen}`);
        this.#title();
        // A new screen starts at the top; carrying the old offset drops the
        // reader mid-list with the heading off-screen (M-14).
        window.scrollTo({ top: 0, behavior: 'instant' });
      });
    }
  }

  #title(): void {
    document.title = `${TITLES[this.route]} · Sailflow`;
  }

  /** Push a history entry: Back returns to where the user was. */
  navigate(route: Route, params: Params = {}): void {
    location.hash = buildHash(route, params);
  }

  /**
   * Rewrite the current screen's params without a history entry — what the
   * debounced scenario writer uses, so a study session does not bury Back
   * under one entry per slider drag.
   */
  replaceParams(params: Params): void {
    const next = buildHash(this.route, params);
    if (next === currentHash()) return;
    history.replaceState(null, '', next);
    this.params = params;
  }
}

export const router = new Router();

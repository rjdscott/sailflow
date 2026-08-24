/**
 * Minimal hash router. No dependency — five known screens don't need a
 * routing library. Unknown hashes fall back to the default route.
 */

export const ROUTES = ['race', 'dock', 'log', 'drills', 'more', 'kit'] as const;
export type Route = (typeof ROUTES)[number];

export const DEFAULT_ROUTE: Route = 'race';

export function parseHash(hash: string): Route {
  const slug = hash.replace(/^#\/?/, '').split('?')[0].split('/')[0];
  return (ROUTES as readonly string[]).includes(slug) ? (slug as Route) : DEFAULT_ROUTE;
}

function currentHash(): string {
  return typeof location !== 'undefined' ? location.hash : '';
}

class Router {
  route: Route = $state(parseHash(currentHash()));

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        this.route = parseHash(currentHash());
      });
    }
  }

  navigate(route: Route): void {
    location.hash = `#/${route}`;
  }
}

export const router = new Router();

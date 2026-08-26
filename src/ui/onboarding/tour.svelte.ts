import { settings } from '../stores/settings.svelte';

/**
 * Session state for the first-run tour. The *seen* flag is the persisted one,
 * in `settings`; these two are derived from it once at startup.
 *
 * Two fields, not one, and the second one is load-bearing: `App.svelte` gates
 * the dynamic import on `mounted`, so a returning visitor never fetches the
 * tour chunk — but if it gated on `open`, dismissing the tour would tear the
 * component down in the same flush that closed it, and the effect that records
 * the dismissal would never run. `mounted` latches on; `open` is what moves.
 *
 * It lives here rather than inside `Tour.svelte` so More can re-open the tour
 * without clearing the persisted flag.
 */
export const tour = $state({ open: !settings.tourSeen, mounted: !settings.tourSeen });

/** More → Settings → "Show again". Does not clear `settings.tourSeen`. */
export function replayTour(): void {
  tour.mounted = true;
  tour.open = true;
}

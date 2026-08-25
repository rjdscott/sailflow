<script lang="ts">
  /**
   * Padlock, stroked in `currentColor` like the rest of the icon set, so it
   * inverts with the theme instead of glowing (audit ux-01 M-16). Replaces the
   * 🔒 emoji wherever a locked control is drawn.
   */
  let { size = 16 }: { size?: number } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 16 16"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
  focusable="false"
>
  <rect x="3" y="7" width="10" height="7" rx="1.5" />
  <path d="M5.5 7V4.75a2.5 2.5 0 0 1 5 0V7" />
</svg>

<style>
  svg {
    display: block;
    flex: none;
  }
</style>

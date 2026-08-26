<script lang="ts">
  import Sheet from '../components/Sheet.svelte';

  /**
   * "Turns" with a picture of what a turn is (audit ux-01 M-20).
   *
   * The Dock asks for uppers and lowers in turns from base and, until now,
   * never showed where a turn is made or how one is counted — which is the
   * one thing a sailor who has not tuned a rig before does not know.
   *
   * Own-drawn schematic, tokens only, not to scale, and no numbers: every
   * number that belongs here is the *guide's*, and the guide's own table is
   * three cards down. What this adds is the procedure, which is the same for
   * every guide and every wind band.
   */
  let open = $state(false);

  const ariaLabel =
    'Schematic of one side of the rig: the upper shroud from the mast tip over the spreader tip to the chainplate, ' +
    'the lower shroud from the spreader root to the same deck, and a turnbuckle barrel enlarged beside them with ' +
    'an arrow showing one full rotation — one turn.';

  /** The order matters more than the wording; each step is one action. */
  const STEPS: string[] = [
    'Backstay off and the rig unloaded before you turn anything — a loaded turnbuckle will not move evenly, and it chews the thread.',
    'Count from the guide’s base setting, not from wherever the barrel happens to sit today. One turn is one full rotation of the barrel; half turns count.',
    'Port and starboard together, the same number, or the mast goes out of column athwartships.',
    'Uppers first, then lowers: the uppers set headstay tension and mast tip support, and the lowers set prebend against whatever the uppers just did.',
    'Sight up the mast track after each pair. Straight side to side; the fore-and-aft bow is the prebend you are aiming for.',
    'Re-pin and tape the turnbuckles. Class rule C.9.5(a) freezes the standing rigging from leaving the dock until racing finishes, so this is the last chance to change it.',
  ];
</script>

<figure class="shroud">
  <svg viewBox="0 0 200 120" role="img" aria-label={ariaLabel}>
    <!-- Mast, spreader, and the two wires the Dock asks about. -->
    <line class="mast" x1="52" y1="6" x2="52" y2="104" />
    <line class="spar" x1="52" y1="44" x2="92" y2="50" />
    <path class="wire upper" d="M52 10 L92 50 L74 104" />
    <path class="wire lower" d="M52 46 L74 104" />
    <circle class="node" cx="52" cy="10" r="2.5" />
    <circle class="node" cx="92" cy="50" r="2.5" />

    <!-- Deck and chainplate: where both wires land, and where the barrels are. -->
    <line class="deck" x1="30" y1="104" x2="104" y2="104" />

    <text class="mark" x="96" y="30">Upper</text>
    <text class="mark" x="30" y="80">Lower</text>

    <!-- The turnbuckle, drawn large to one side: this is the thing being
         counted, and at rig scale it is three pixels tall. -->
    <line class="lead" x1="78" y1="96" x2="132" y2="62" />
    <line class="wire" x1="152" y1="18" x2="152" y2="40" />
    <rect class="barrel" x="142" y="40" width="20" height="34" rx="3" />
    <line class="barrel-line" x1="146" y1="50" x2="158" y2="50" />
    <line class="barrel-line" x1="146" y1="57" x2="158" y2="57" />
    <line class="barrel-line" x1="146" y1="64" x2="158" y2="64" />
    <line class="wire" x1="152" y1="74" x2="152" y2="96" />
    <path class="turn" d="M168 46 a 14 14 0 1 1 -13 -8" marker-end="url(#shroud-arrow)" />
    <text class="mark turn-label" x="176" y="86">1 turn</text>

    <defs>
      <marker
        id="shroud-arrow"
        viewBox="0 0 8 8"
        refX="7"
        refY="4"
        markerWidth="4"
        markerHeight="4"
        orient="auto"
      >
        <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--accent)" />
      </marker>
    </defs>
  </svg>
  <figcaption>
    Not to scale. A turn is one full rotation of the barrel, both sides the same.
  </figcaption>
</figure>

<button type="button" class="quiet" onclick={() => (open = true)}>How to apply turns</button>

<Sheet bind:open title="How to apply turns">
  <ol class="steps">
    {#each STEPS as s (s)}
      <li>{s}</li>
    {/each}
  </ol>
  <p class="foot">
    The numbers to dial in are the tuning guide's, not this app's — Race → Rig has the guide's own
    table with today's band lit up, and the Print tuning card button below puts it on paper.
  </p>
</Sheet>

<style>
  .shroud {
    margin: 0 0 var(--space-2);
  }

  svg {
    display: block;
    width: 100%;
    max-width: 280px;
    height: auto;
    margin-inline: auto;
  }

  path,
  line,
  rect {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }

  .mast,
  .spar {
    stroke: var(--ink);
    stroke-width: 2.5;
  }

  .wire {
    stroke: var(--accent);
    stroke-width: 1.5;
  }

  .wire.lower {
    stroke: var(--ink-2);
  }

  .deck {
    stroke: var(--line-strong);
    stroke-width: 1.5;
  }

  .node {
    fill: var(--accent);
  }

  .barrel {
    fill: var(--surface);
    stroke: var(--ink);
    stroke-width: 1.5;
  }

  .barrel-line {
    stroke: var(--ink-2);
    stroke-width: 1;
  }

  /* The leader that says "this detail is that fitting". */
  .lead {
    stroke: var(--line-strong);
    stroke-width: 0.75;
    stroke-dasharray: 3 3;
  }

  .turn {
    stroke: var(--accent);
    stroke-width: 1.5;
  }

  .mark {
    fill: var(--ink-2);
    font-size: 10px;
  }

  .turn-label {
    text-anchor: middle;
  }

  figcaption {
    margin-top: var(--space-2);
    font-size: var(--text-xs);
    color: var(--ink-2);
  }

  .quiet {
    min-height: var(--hit-min);
    padding: 0 var(--space-3);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: transparent;
    color: var(--ink-2);
    font-size: var(--text-sm);
    cursor: pointer;
  }

  .steps {
    margin: 0;
    padding-inline-start: 1.3em;
    font-size: var(--text-sm);
    line-height: 1.55;
    color: var(--ink);
  }

  .steps li + li {
    margin-top: var(--space-2);
  }

  .foot {
    margin: var(--space-3) 0 0;
    font-size: var(--text-xs);
    color: var(--ink-2);
  }
</style>

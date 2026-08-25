/**
 * The short memory behind the cockpit's sparklines: the last N solves at one
 * set of conditions. No clock — a sample is whatever the caller pushed, in the
 * order it pushed it, so the same sequence always draws the same line.
 */
export class History {
  /** How many samples are kept. The oldest falls off the end. */
  readonly size: number;

  /**
   * The condition the kept samples belong to, or `null` when empty. A push
   * under a different key throws the buffer away: a trend across a change of
   * conditions is two different boats on one line.
   */
  key: string | null = null;

  private rows: Record<string, number>[] = [];

  constructor(size = 24) {
    this.size = size;
  }

  push(key: string, sample: Record<string, number>): void {
    if (key !== this.key) this.reset();
    this.key = key;
    this.rows.push(sample);
    if (this.rows.length > this.size) this.rows.shift();
  }

  /**
   * One field's samples, oldest to newest. A sample that did not carry the
   * field, or carried a NaN, is skipped rather than drawn as a hole.
   */
  series(field: string): number[] {
    return this.rows.map((r) => r[field]).filter((n) => Number.isFinite(n));
  }

  reset(): void {
    this.rows = [];
    this.key = null;
  }
}

import { describe, expect, it } from 'vitest';
import { isTypingTarget, keyAction } from './keys';

const el = (tagName: string, type = '', isContentEditable = false): EventTarget =>
  ({ tagName, type, isContentEditable }) as unknown as EventTarget;

describe('isTypingTarget', () => {
  it('is true where the keystroke is the user typing', () => {
    expect(isTypingTarget(el('INPUT', 'text'))).toBe(true);
    expect(isTypingTarget(el('INPUT', 'number'))).toBe(true);
    expect(isTypingTarget(el('TEXTAREA'))).toBe(true);
    expect(isTypingTarget(el('DIV', '', true))).toBe(true);
  });

  it('is false on a slider, a button and the page itself', () => {
    expect(isTypingTarget(el('INPUT', 'range'))).toBe(false);
    expect(isTypingTarget(el('BUTTON'))).toBe(false);
    expect(isTypingTarget(null)).toBe(false);
  });
});

describe('keyAction', () => {
  it('maps 1–5 to a point of sail', () => {
    expect(keyAction({ key: '1' }, false)).toEqual({ type: 'pointOfSail', index: 0 });
    expect(keyAction({ key: '5' }, false)).toEqual({ type: 'pointOfSail', index: 4 });
    expect(keyAction({ key: '6' }, false)).toBeNull();
  });

  it('maps the trim keys', () => {
    expect(keyAction({ key: 'o' }, false)).toEqual({ type: 'applyOptimum' });
    expect(keyAction({ key: 'u' }, false)).toEqual({ type: 'undo' });
    expect(keyAction({ key: '?' }, false)).toEqual({ type: 'help' });
  });

  it('stays out of the way while typing and under a modifier', () => {
    expect(keyAction({ key: 'o' }, true)).toBeNull();
    expect(keyAction({ key: '1' }, true)).toBeNull();
    expect(keyAction({ key: 'o', metaKey: true }, false)).toBeNull();
    expect(keyAction({ key: 'u', ctrlKey: true }, false)).toBeNull();
  });
});

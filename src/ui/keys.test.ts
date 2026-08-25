import { describe, expect, it } from 'vitest';
import {
  isTypingTarget,
  keyAction,
  PANELS,
  panelControlsId,
  panelTitleId,
  SHORTCUTS,
} from './keys';

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
    expect(keyAction({ key: 'b' }, false)).toEqual({ type: 'abCompare' });
    expect(keyAction({ key: 'p' }, false)).toEqual({ type: 'puffReplay' });
    expect(keyAction({ key: '?' }, false)).toEqual({ type: 'help' });
  });

  it('jumps to a panel', () => {
    expect(keyAction({ key: 'm' }, false)).toEqual({ type: 'focusPanel', panel: 'mainsail' });
    expect(keyAction({ key: 'j' }, false)).toEqual({ type: 'focusPanel', panel: 'headsail' });
    expect(keyAction({ key: 'h' }, false)).toEqual({ type: 'focusPanel', panel: 'helm' });
    expect(keyAction({ key: 'r' }, false)).toEqual({ type: 'focusPanel', panel: 'rig' });
  });

  it('has one key per panel and no key bound twice', () => {
    const bound = ['1', '2', '3', '4', '5', 'o', 'u', 'b', 'p', 'm', 'j', 'h', 'r', '?'];
    expect(new Set(bound).size).toBe(bound.length);
    const panels = bound
      .map((key) => keyAction({ key }, false))
      .filter((a) => a?.type === 'focusPanel')
      .map((a) => (a as { panel: string }).panel);
    expect(panels.sort()).toEqual(PANELS.map((p) => p.id).sort());
  });

  it('stays out of the way while typing and under a modifier', () => {
    expect(keyAction({ key: 'o' }, true)).toBeNull();
    expect(keyAction({ key: '1' }, true)).toBeNull();
    expect(keyAction({ key: 'm' }, true)).toBeNull();
    expect(keyAction({ key: 'j' }, true)).toBeNull();
    expect(keyAction({ key: 'o', metaKey: true }, false)).toBeNull();
    expect(keyAction({ key: 'u', ctrlKey: true }, false)).toBeNull();
    expect(keyAction({ key: 'b' }, true)).toBeNull();
    expect(keyAction({ key: 'p' }, true)).toBeNull();
  });
});

describe('SHORTCUTS', () => {
  it('documents every key the mapping answers to', () => {
    const documented = SHORTCUTS.map((s) => s.keys).join(' ');
    for (const key of ['1 – 5', 'm', 'j', 'h', 'r', 'o', 'u', 'b', 'p', '?']) {
      expect(documented, `${key} is bound but not in the help sheet`).toContain(key);
    }
  });
});

describe('panelControlsId', () => {
  it('names the element the jump looks inside', () => {
    expect(panelControlsId('mainsail')).toBe('mainsail-controls');
    expect(panelControlsId('headsail')).toBe('headsail-controls');
    expect(panelControlsId('helm')).toBe('helm-controls');
    expect(panelControlsId('rig')).toBe('rig-controls');
  });

  /* The panels hard-code these two ids in their markup; if the convention
     drifts the keyboard jump and the phone tab strip both go quiet. */
  it('names each panel heading the same way the panels do', () => {
    expect(PANELS.map((p) => panelTitleId(p.id))).toEqual([
      'mainsail-title',
      'headsail-title',
      'helm-title',
      'rig-title',
    ]);
  });
});

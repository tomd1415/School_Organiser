import { describe, it, expect } from 'vitest';
import { FocusModeManager } from '../src/lib/focusMode';
import { calculateCountdown, tzDateToEpoch } from '../src/lib/time';

describe('FocusModeManager unit tests', () => {
  it('initializes with focus-mode class if storage has true', () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => { store.set(key, val); }
    };
    store.set('focus-mode', 'true');
    const classes = new Set<string>();
    const mockBody = {
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        toggle: (c: string) => {
          if (classes.has(c)) {
            classes.delete(c);
            return false;
          } else {
            classes.add(c);
            return true;
          }
        }
      }
    };
    
    const manager = new FocusModeManager(mockStorage, mockBody);
    manager.init();
    expect(classes.has('focus-mode')).toBe(true);
  });

  it('initializes without focus-mode class if storage has false or null', () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => { store.set(key, val); }
    };
    const classes = new Set<string>('focus-mode'); // start with it
    const mockBody = {
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        toggle: (c: string) => {
          if (classes.has(c)) {
            classes.delete(c);
            return false;
          } else {
            classes.add(c);
            return true;
          }
        }
      }
    };
    
    const manager = new FocusModeManager(mockStorage, mockBody);
    manager.init();
    expect(classes.has('focus-mode')).toBe(false);
  });

  it('toggles focus-mode class and updates storage', () => {
    const store = new Map<string, string>();
    const mockStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, val: string) => { store.set(key, val); }
    };
    const classes = new Set<string>();
    const mockBody = {
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        toggle: (c: string) => {
          if (classes.has(c)) {
            classes.delete(c);
            return false;
          } else {
            classes.add(c);
            return true;
          }
        }
      }
    };
    
    const manager = new FocusModeManager(mockStorage, mockBody);
    expect(manager.toggle()).toBe(true);
    expect(classes.has('focus-mode')).toBe(true);
    expect(store.get('focus-mode')).toBe('true');

    expect(manager.toggle()).toBe(false);
    expect(classes.has('focus-mode')).toBe(false);
    expect(store.get('focus-mode')).toBe('false');
  });
});

describe('Clock countdown drift protection unit tests', () => {
  it('calculates countdowns correctly based on absolute system time', () => {
    const target = 100000;
    
    // Started (at or after target)
    expect(calculateCountdown(target, 100000)).toBe('started');
    expect(calculateCountdown(target, 105000)).toBe('started');

    // Exactly minutes
    expect(calculateCountdown(target, 40000)).toBe('starts in 1 mins');
    expect(calculateCountdown(target, 0)).toBe('starts in 1m 40s');
    expect(calculateCountdown(target, 99000)).toBe('starts in 1s');
  });

  it('tzDateToEpoch correctly converts timezone specific local times to UTC epochs', () => {
    // Let's test standard UTC timezone
    const epochUtc = tzDateToEpoch('2026-06-21', 540, 'UTC'); // 09:00 UTC
    expect(epochUtc).toBe(Date.UTC(2026, 5, 21, 9, 0, 0));

    // Let's test Europe/London (GMT+1 in June)
    const epochLondon = tzDateToEpoch('2026-06-21', 540, 'Europe/London'); // 09:00 London (08:00 UTC)
    expect(epochLondon).toBe(Date.UTC(2026, 5, 21, 8, 0, 0));
  });
});

import { useSyncExternalStore } from 'react';

// Motion preferences: OS prefers-reduced-motion PLUS a manual "Reduce Motion"
// toggle persisted in localStorage. Manual "on" always wins; the OS setting alone
// is enough to reduce (both gate the WebGL layer and content motion).
const STORAGE_KEY = 'clps-reduce-motion';

let listeners: Array<() => void> = [];
let manual = readStored();

const osQuery =
  typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

if (osQuery) osQuery.addEventListener('change', emit);

export function isMotionReduced(): boolean {
  return manual || Boolean(osQuery && osQuery.matches);
}

export function isManualReduce(): boolean {
  return manual;
}

export function setManualReduce(value: boolean) {
  manual = value;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    // storage blocked — the in-memory toggle still works
  }
  emit();
}

function subscribe(l: () => void) {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

export function useMotionPrefs() {
  const reduced = useSyncExternalStore(subscribe, isMotionReduced, () => true);
  const manualOn = useSyncExternalStore(subscribe, isManualReduce, () => false);
  return { reduced, manualOn, setManualReduce };
}

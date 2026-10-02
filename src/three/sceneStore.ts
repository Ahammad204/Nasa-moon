import { useSyncExternalStore } from 'react';

export type Quality = 2 | 1 | 0; // 2 = full, 1 = reduced detail, 0 = fall back to 2D
export type MapMode = 'globe' | 'flat';

// Mutable scene state shared between DOM and the render loop. Per-frame values
// are plain fields (never React state); only quality/mapMode/selectedId are
// reactive (they change rarely and must reach both DOM and scene mounting).
export const scene = {
  pointerX: 0,
  pointerY: 0,
  scrollY: 0,
  quality: 2 as Quality,
  globe: {
    // Default framing: south-polar focus (K04) — 6 of 9 markers land in the
    // visible disc at yaw -0.06 / pitch -1.06; the rest face in on list click.
    yaw: -0.06,
    pitch: -1.06,
    zoom: 6,
    cmd: null as string | null,
    selectedId: null as string | null,
  },
  // Hero moon drag (slot overlay in HeroSection → HomeScene render loop).
  hero: {
    dragging: false,
    dyaw: 0,
    dpitch: 0,
    px: 0,
    py: 0,
  },
};

interface Flags {
  mapMode: MapMode;
  selectedId: string | null;
  compareIds: string[];
  payloadFocus: string | null;
  navRequest: string | null;
}

const DEFAULT_FLAGS: Flags = {
  mapMode: 'flat',
  selectedId: null,
  compareIds: [],
  payloadFocus: null,
  navRequest: null,
};
let flags: Flags = { ...DEFAULT_FLAGS };
let listeners: Array<() => void> = [];

function emit() {
  listeners.forEach((l) => l());
}

export function setQuality(q: Quality) {
  if (scene.quality === q) return;
  scene.quality = q;
  emit();
}

export function setMapMode(mode: MapMode) {
  if (flags.mapMode === mode) return;
  flags = { ...flags, mapMode: mode };
  emit();
}

// Selection is app-scene state: DOM lists and 3D markers both drive it.
export function selectFromScene(id: string | null) {
  if (flags.selectedId === id) return;
  flags = { ...flags, selectedId: id };
  scene.globe.selectedId = id;
  emit();
}

export function requestGlobeCmd(cmd: string) {
  scene.globe.cmd = cmd;
}

// Compare set mirror (from the URL-backed useCompare) for the spatial scene.
export function setCompareIds(ids: string[]) {
  if (flags.compareIds.length === ids.length && flags.compareIds.every((x, i) => x === ids[i])) return;
  flags = { ...flags, compareIds: ids };
  emit();
}

// Payload graph node focus (3D → DOM list highlight).
export function setPayloadFocus(name: string | null) {
  if (flags.payloadFocus === name) return;
  flags = { ...flags, payloadFocus: name };
  emit();
}

// 3D → router navigation bridge (mission nodes in scenes).
export function requestNavigate(path: string) {
  flags = { ...flags, navRequest: path };
  emit();
}

export function setNavRequest(path: string | null) {
  if (flags.navRequest === path) return;
  flags = { ...flags, navRequest: path };
  emit();
}

export function subscribeScene(l: () => void) {
  listeners.push(l);
  return () => {
    listeners = listeners.filter((x) => x !== l);
  };
}

export function useSceneQuality(): Quality {
  return useSyncExternalStore(subscribeScene, () => scene.quality, () => 2);
}

export function useSceneFlags(): Flags {
  return useSyncExternalStore(subscribeScene, () => flags, () => DEFAULT_FLAGS);
}
export function attachSceneInputs() {
  const onMove = (e: PointerEvent) => {
    scene.pointerX = (e.clientX / window.innerWidth - 0.5) * 2;
    scene.pointerY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  const onScroll = () => {
    scene.scrollY = window.scrollY;
  };
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('scroll', onScroll);
  };
}

import { useLocation } from 'react-router-dom';

// Route-aware loading state for lazy pages (and lazy panels). A bare
// "Loading…" on a blank page reads as broken on a slow connection, so the
// fallback keeps the page shape: a title bar, a text line, and a large
// content panel, all pulsing, plus a label that says what is actually
// loading. No fake content — only skeleton blocks and the label.
const LABELS: Array<[RegExp, string]> = [
  [/^\/$/, 'Loading home…'],
  [/^\/missions$/, 'Loading missions…'],
  [/^\/map$/, 'Loading Moon map…'],
  [/^\/features$/, 'Loading named lunar features… 9,087 features'],
  [/^\/mission\//, 'Loading mission…'],
  [/^\/navigator$/, 'Loading Sun & Earth Navigator…'],
  [/^\/south-pole$/, 'Loading south-pole sites…'],
  [/^\/why-south-pole$/, 'Loading Why the South Pole…'],
  [/^\/moon-lab$/, 'Loading Moon Lab…'],
  [/^\/moon-interior$/, 'Loading Moon interior…'],
  [/^\/atlas$/, 'Loading lunar atlas…'],
  [/^\/composition$/, 'Loading Moon composition…'],
  [/^\/library$/, 'Loading research library…'],
  [/^\/compare$/, 'Loading comparison…'],
  [/^\/payloads$/, 'Loading payload explorer…'],
];

function labelFor(pathname: string): string {
  return LABELS.find(([re]) => re.test(pathname))?.[1] ?? 'Loading…';
}

export default function Loading({ label }: { label?: string }) {
  const { pathname } = useLocation();
  const text = label ?? labelFor(pathname);
  return (
    <div role="status" aria-live="polite" aria-label={text}>
      <div className="mb-4 h-8 w-72 max-w-full animate-pulse rounded bg-space-800" />
      <div className="mb-3 h-4 w-full max-w-2xl animate-pulse rounded bg-space-900" />
      <div className="h-[50vh] min-h-[320px] animate-pulse rounded-lg border border-space-800 bg-space-900" />
      <p className="mt-3 text-sm text-slate-400">{text}</p>
    </div>
  );
}

import { requireSource } from '../lib/sources';

/**
 * SourceBadge — a small pill linking out to a research source.
 *
 * Every factual claim added by the Science Context layer carries one of
 * these, so a reader can check the claim in one click. The pill shows the
 * source's short label; the full title + publisher are in the tooltip and
 * the accessible name. Links open in a new tab with noopener/noreferrer.
 */
export default function SourceBadge({ ids }: { ids: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {ids.map((id) => {
        const s = requireSource(id);
        return (
          <a
            key={id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            title={`${s.title} — ${s.publisher}`}
            aria-label={`Source: ${s.title}, ${s.publisher} (opens in a new tab)`}
            className="inline-flex min-h-[28px] items-center rounded-full border border-accent/50 bg-accent-dim/30 px-2.5 py-0.5 text-xs font-medium text-accent hover:bg-accent-dim/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {s.shortLabel} ↗
          </a>
        );
      })}
    </span>
  );
}

// Lunar Feature Explorer — feature detail card (Phase 3b).
//
// Every number comes from the record (USGS Gazetteer via
// src/data/lunar-features.json); a null value is shown as "not published",
// never estimated.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import SourceBadge from '../SourceBadge';
import { CATEGORY_COLORS } from '../../lib/features/categories';
import type { LunarFeatureRecord } from '../../lib/features/engine';

interface Props {
  feature: LunarFeatureRecord;
  onClose: () => void;
}

function formatDiameter(km: number | null): string {
  if (km === null) return 'not published';
  return km >= 100 ? `${km.toLocaleString('en-US')} km` : `${km} km`;
}

export default function FeatureDetailCard({ feature, onClose }: Props) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const navHref = `/navigator?lat=${feature.lat}&lon=${feature.lon}`;
  const shareUrl =
    typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('failed');
    }
  };

  return (
    <article
      aria-label={`Details for ${feature.name}`}
      className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">{feature.name}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-300">
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-full"
              style={{ backgroundColor: CATEGORY_COLORS[feature.category] }}
            />
            {feature.category} · {feature.typeName} ({feature.featureType})
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close feature details"
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md border border-space-700 text-slate-200 hover:bg-space-800"
        >
          ✕
        </button>
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Diameter</dt>
          <dd className="text-right font-medium tabular-nums">{formatDiameter(feature.diameterKm)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Latitude</dt>
          <dd className="text-right font-medium tabular-nums">{feature.lat.toFixed(4)}°</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Longitude</dt>
          <dd className="text-right font-medium tabular-nums">{feature.lon.toFixed(4)}° (east-positive)</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-slate-400">Approved</dt>
          <dd className="text-right font-medium tabular-nums">
            {feature.approvalYear !== null ? feature.approvalYear : 'not published'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Origin of name</dt>
          <dd className="mt-0.5">{feature.originOfName ?? 'not published'}</dd>
        </div>
      </dl>
      <p className="mt-2 text-xs text-slate-400">
        Coordinates are approximate feature centres.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <a
          href={feature.gazetteerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] items-center rounded-md border border-space-700 px-3 text-sm text-accent underline hover:bg-space-800"
        >
          Gazetteer entry ↗
        </a>
        <SourceBadge ids={['usgs-gazetteer']} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          to={navHref}
          className="inline-flex min-h-[44px] items-center rounded-md bg-accent-dim px-4 text-sm font-medium text-white hover:bg-accent"
        >
          Open Sun &amp; Earth Navigator at this feature →
        </Link>
        <button
          type="button"
          onClick={() => void copyLink()}
          className="inline-flex min-h-[44px] items-center rounded-md border border-space-700 px-4 text-sm text-slate-200 hover:bg-space-800"
        >
          {copyState === 'copied'
            ? 'Copied ✓'
            : copyState === 'failed'
              ? 'Copy failed — copy the URL from the address bar'
              : 'Copy shareable link'}
        </button>
      </div>
    </article>
  );
}

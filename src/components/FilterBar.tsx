import type { FilterOptions, Filters } from '../lib/filters';
import { EMPTY_FILTERS } from '../lib/filters';

interface Props {
  options: FilterOptions;
  value: Filters;
  onChange: (value: Filters) => void;
}

const GROUPS: { key: keyof Filters; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'provider', label: 'Provider' },
  { key: 'year', label: 'Launch year' },
  { key: 'region', label: 'Region' },
];

export default function FilterBar({ options, value, onChange }: Props) {
  const active: { group: keyof Filters; item: string }[] = GROUPS.flatMap(({ key }) =>
    value[key].map((item) => ({ group: key, item }))
  );

  function toggle(group: keyof Filters, item: string) {
    const current = value[group];
    onChange({
      ...value,
      [group]: current.includes(item) ? current.filter((x) => x !== item) : [...current, item],
    });
  }

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {GROUPS.map(({ key, label }) => (
          <fieldset key={key}>
            <legend className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {label}
            </legend>
            <div className="flex flex-wrap gap-1">
              {options[key].map((item) => (
                <label
                  key={item}
                  className={`flex min-h-[44px] cursor-pointer items-center rounded-full border px-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/60 ${
                    value[key].includes(item)
                      ? 'border-accent/60 bg-accent-dim/40 text-accent'
                      : 'border-space-700 text-slate-300 hover:border-accent/40 hover:bg-space-900'
                  }`}
                >
                  {/* sr-only: the chip itself is the control — no native box,
                      but the input stays for click handling + a11y state. */}
                  <input
                    type="checkbox"
                    checked={value[key].includes(item)}
                    onChange={() => toggle(key, item)}
                    className="sr-only"
                  />
                  {item}
                </label>
              ))}
            </div>
          </fieldset>
        ))}
      </div>

      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm" role="status">
          <span className="text-slate-400">Active:</span>
          {active.map(({ group, item }) => (
            <button
              key={`${group}:${item}`}
              type="button"
              onClick={() => toggle(group, item)}
              aria-label={`Remove filter ${item}`}
              className="flex min-h-[44px] items-center gap-1 rounded-full border border-accent/60 bg-accent-dim/40 px-3 text-accent"
            >
              {item} <span aria-hidden="true">(x)</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTERS)}
            className="flex min-h-[44px] items-center text-accent underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="relative">
      <label htmlFor="mission-search" className="sr-only">
        Search missions
      </label>
      <input
        id="mission-search"
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search missions, landers, payloads..."
        className="min-h-[44px] w-full rounded-md border border-space-700 bg-space-900 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 hover:bg-space-800"
        >
          x
        </button>
      )}
    </div>
  );
}

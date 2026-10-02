import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

const MAX_COMPARE = 3;

interface CompareState {
  ids: string[];
  message: string | null;
  toggle: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareState | null>(null);

// The `compare` query param is the source of truth (FR-9): shared URLs restore the set.
export function CompareProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);

  const ids = useMemo(() => (params.get('compare') ?? '').split(',').filter(Boolean), [params]);

  const value = useMemo<CompareState>(() => {
    function setIds(next: string[]) {
      const p = new URLSearchParams(params);
      if (next.length > 0) p.set('compare', next.join(','));
      else p.delete('compare');
      setParams(p, { replace: true });
    }
    return {
      ids,
      message,
      toggle(id: string) {
        if (ids.includes(id)) {
          setIds(ids.filter((x) => x !== id));
          setMessage(null);
          return;
        }
        if (ids.length >= MAX_COMPARE) {
          setMessage(`Compare holds up to ${MAX_COMPARE} missions.`);
          return;
        }
        setMessage(null);
        setIds([...ids, id]);
      },
      remove(id: string) {
        setIds(ids.filter((x) => x !== id));
        setMessage(null);
      },
      clear() {
        setIds([]);
        setMessage(null);
      },
    };
  }, [ids, message, params, setParams]);

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareState {
  const state = useContext(CompareContext);
  if (!state) throw new Error('useCompare must be used inside CompareProvider');
  return state;
}

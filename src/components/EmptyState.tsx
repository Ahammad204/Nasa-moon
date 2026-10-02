import type { ReactNode } from 'react';

interface Props {
  title: string;
  body?: string;
  action?: ReactNode;
}

export default function EmptyState({ title, body, action }: Props) {
  return (
    <div className="rounded-lg border border-space-800 bg-space-900 p-8 text-center">
      <p className="text-lg font-medium text-slate-200">{title}</p>
      {body && <p className="mt-2 text-slate-400">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

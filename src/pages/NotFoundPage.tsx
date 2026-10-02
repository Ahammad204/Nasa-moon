import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-2xl font-bold">Not found</h1>
      <p className="mt-2 text-slate-400">That page does not exist.</p>
      <Link to="/missions" className="mt-4 inline-flex min-h-[44px] items-center text-accent underline">
        Back to missions
      </Link>
    </section>
  );
}

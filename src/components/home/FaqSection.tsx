import { Link } from 'react-router-dom';

// "FAQ" — four questions, answered only from documented facts
// (README, docs/DATA_SOURCES.md, docs/SUN_EARTH_METHOD.md and the
// South Pole page wording). Nothing invented.

const QA = [
  {
    q: 'What is CLPS?',
    a: 'Commercial Lunar Payload Services — NASA’s programme where American companies deliver NASA science and technology payloads to the lunar surface. This site tracks all 15 CLPS deliveries in the NASA dataset, from the first launches in 2024 to the ones still queued.',
  },
  {
    q: 'Why does sunlight matter for a lander?',
    a: 'A lander runs on solar power, so sunlight is its fuel. The “longest dark” number on this site is the longest stretch without Sun — the lander’s batteries must survive that. At the south pole, sunlit ridges sit right next to craters that never see the Sun at all, so the landing spot decides how much power a mission gets.',
  },
  {
    q: 'Can I trust these numbers?',
    a: 'They are computed, not guessed: Sun and Moon positions come from the astronomy-engine library (sub-arcminute accuracy), and the Sun/Earth geometry follows Meeus, “Astronomical Algorithms”, chapter 53 — validated against the book’s worked example and the Apollo 11 landing. The limits are stated everywhere: a geometric ideal horizon (terrain is not included) and positions good to about ±0.3°. Coordinates are approximate feature centres.',
  },
  {
    q: 'Why do some sites have no coordinates?',
    a: 'NASA’s August 2022 announcement named 13 Artemis III candidate regions but published no numeric coordinates for them. Only three regions have coordinates verified against a NASA or USGS source — Malapert Massif, Mons Mouton and Shackleton crater. The other eleven are listed with “no verified coordinates” and excluded from every calculation, instead of being plotted with a guessed point.',
  },
];

export default function FaqSection() {
  return (
    <section aria-labelledby="faq-heading" className="mt-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-sky-300">
        ❓ Good questions
      </p>
      <h2 id="faq-heading" className="mt-1 text-2xl font-bold sm:text-3xl">
        Frequently asked questions
      </h2>
      <div className="mt-5 space-y-3">
        {QA.map((item) => (
          <details
            key={item.q}
            className="rounded-lg border border-space-800 bg-space-900 p-4 shadow-panel"
          >
            <summary className="cursor-pointer text-base font-semibold text-slate-100">
              {item.q}
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{item.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-4 text-sm text-slate-400">
        Still curious?{' '}
        <Link to="/navigator" className="text-accent underline">
          Open the Navigator
        </Link>{' '}
        and try a site and a date yourself — the numbers update live.
      </p>
    </section>
  );
}

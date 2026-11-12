/** Shared readouts formatting for the Sun & Earth Navigator. */

/** Degrees with one decimal, always with the unit: "12.4°". */
export function fmtDeg(value: number, digits = 1): string {
  return `${value.toFixed(digits)}°`;
}

/** Azimuth as whole degrees with the unit: "87°". */
export function fmtAzimuth(value: number): string {
  return `${Math.round(((value % 360) + 360) % 360)}°`;
}

/** Milliseconds as "2 d 4 h", "5 h 12 min", "42 min", or "30 s". */
export function fmtDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min`;
  return `${seconds} s`;
}

/** "2026-11-13 07:00 UTC" — always UTC, always labelled. */
export function fmtUtc(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(date.getUTCDate())} ` +
    `${p(date.getUTCHours())}:${p(date.getUTCMinutes())} UTC`
  );
}

/** Short UTC time for chart ticks: "13 Nov 07:00". */
export function fmtUtcShort(date: Date): string {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${p(date.getUTCHours())}:${p(date.getUTCMinutes())}`;
}

/** Hours with one decimal and the unit: "354.0 h". */
export function fmtHours(hours: number): string {
  return `${hours.toFixed(1)} h`;
}

/** Percent of a window with no decimals: "50%". */
export function fmtPct(part: number, total: number): string {
  if (total <= 0) return '—';
  return `${Math.round((part / total) * 100)}%`;
}

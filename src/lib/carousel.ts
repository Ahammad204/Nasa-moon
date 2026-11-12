// Carousel helpers: which card is centred in a horizontal scroll-snap row.
// Pure functions, so they can be unit-tested without a DOM.

/** Index of the card whose centre is nearest `viewportCenter` (px, in the
 * scroller's content coordinates). Returns -1 when there are no cards. On an
 * exact tie the earlier card wins. */
export function centerIndex(cardCenters: number[], viewportCenter: number): number {
  if (cardCenters.length === 0) return -1;
  let best = 0;
  let bestDist = Math.abs(cardCenters[0] - viewportCenter);
  for (let i = 1; i < cardCenters.length; i += 1) {
    const d = Math.abs(cardCenters[i] - viewportCenter);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Clamp an index into [0, count - 1]; -1 when there are no cards. */
export function clampIndex(index: number, count: number): number {
  if (count <= 0) return -1;
  return Math.min(count - 1, Math.max(0, index));
}

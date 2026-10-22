// Fits a "Jon ● cheng" name row to its width by writing --hero-size.
// Fits: used by hero.tsx + contact.tsx (same wordmark, two places).

/** Font-size so the parts (+ the row's 2 gaps) exactly fill `row`'s width. Measured; call on resize/font load. */
export function fitNameToWidth(row: HTMLElement, parts: HTMLElement[]) {
  const cs = getComputedStyle(row);
  const fontSizePx = parseFloat(cs.fontSize);
  const gapPx = parseFloat(cs.columnGap) || 0;
  const available = row.clientWidth;
  if (!fontSizePx || available <= 0) return;
  const perEm = parts.reduce((w, el) => w + el.offsetWidth, 0) / fontSizePx;
  if (perEm <= 0) return;
  const fitted = (available - (parts.length - 1) * gapPx) / perEm;
  if (fitted > 0) row.style.setProperty("--hero-size", `${fitted}px`);
}

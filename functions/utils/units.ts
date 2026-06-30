/**
 * Lightweight unit conversion for inventory deduction & food-cost math.
 *
 * Units are grouped by dimension (mass / volume / count). Conversion is only done
 * within the same dimension; across dimensions (or unknown units) we assume the
 * quantity is already in the target unit and return it unchanged — a safe no-op that
 * never corrupts stock. Stock math stays in each inventory item's own stock unit.
 */
type Dim = 'mass' | 'volume' | 'count';

// factor = how many BASE units (g for mass, ml for volume, each for count) in one of this unit
const UNITS: Record<string, { dim: Dim; factor: number }> = {
  mg: { dim: 'mass', factor: 0.001 },
  g:  { dim: 'mass', factor: 1 },
  gram: { dim: 'mass', factor: 1 },
  grams: { dim: 'mass', factor: 1 },
  kg: { dim: 'mass', factor: 1000 },

  ml: { dim: 'volume', factor: 1 },
  l:  { dim: 'volume', factor: 1000 },
  ltr: { dim: 'volume', factor: 1000 },
  litre: { dim: 'volume', factor: 1000 },
  liter: { dim: 'volume', factor: 1000 },

  pcs: { dim: 'count', factor: 1 },
  pc: { dim: 'count', factor: 1 },
  piece: { dim: 'count', factor: 1 },
  pieces: { dim: 'count', factor: 1 },
  unit: { dim: 'count', factor: 1 },
  packet: { dim: 'count', factor: 1 },
  packets: { dim: 'count', factor: 1 },
  pkt: { dim: 'count', factor: 1 },
  box: { dim: 'count', factor: 1 },
  boxes: { dim: 'count', factor: 1 },
  crate: { dim: 'count', factor: 1 },
  crates: { dim: 'count', factor: 1 },
};

function norm(u: string | null | undefined): string {
  return String(u || '').trim().toLowerCase();
}

/**
 * Convert `qty` expressed in `fromUnit` into `toUnit`.
 * Same unit → unchanged. Same dimension → scaled. Otherwise → unchanged (no-op).
 */
export function convertUnit(qty: number, fromUnit: string, toUnit: string): number {
  const f = norm(fromUnit), t = norm(toUnit);
  if (!f || !t || f === t) return qty;
  const a = UNITS[f], b = UNITS[t];
  if (!a || !b || a.dim !== b.dim) return qty; // unknown or cross-dimension → assume already aligned
  return (qty * a.factor) / b.factor;
}

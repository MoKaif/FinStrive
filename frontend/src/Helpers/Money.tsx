/**
 * Formatting for the holdings terminal. Statements are Indian, so amounts use
 * lakh/crore digit grouping throughout rather than thousands.
 */

const grouped = (value: number, decimals: number) =>
  new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);

/** "4,28,788" — no currency symbol, so column headers can carry the unit. */
export const amount = (value: number | null | undefined, decimals = 0) =>
  value === null || value === undefined ? "—" : grouped(value, decimals);

/** "₹4,28,788" for standalone figures outside a money column. */
export const rupees = (value: number | null | undefined, decimals = 0) =>
  value === null || value === undefined ? "—" : `₹${grouped(value, decimals)}`;

/** Always carries a sign, so gains and losses are distinguishable without colour. */
export const signedAmount = (value: number | null | undefined, decimals = 0) => {
  if (value === null || value === undefined) return "—";
  const sign = value < 0 ? "−" : "+";
  return `${sign}${grouped(Math.abs(value), decimals)}`;
};

export const percent = (value: number | null | undefined, decimals = 2) =>
  value === null || value === undefined ? "—" : `${grouped(value, decimals)}%`;

export const signedPercent = (value: number | null | undefined, decimals = 2) => {
  if (value === null || value === undefined) return "—";
  const sign = value < 0 ? "−" : "+";
  return `${sign}${grouped(Math.abs(value), decimals)}%`;
};

/** Units are held to three decimals in fund statements. */
export const units = (value: number | null | undefined) =>
  value === null || value === undefined ? "—" : grouped(value, 3);

/** Axis-scale shorthand: "4.29L", "1.20Cr". */
export const compact = (value: number) => {
  const magnitude = Math.abs(value);
  if (magnitude >= 1_00_00_000) return `${(value / 1_00_00_000).toFixed(2)}Cr`;
  if (magnitude >= 1_00_000) return `${(value / 1_00_000).toFixed(2)}L`;
  if (magnitude >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${value}`;
};

/** "25 Jul 2026" */
export const statementDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/** "Jul 26" for dense axis ticks. */
export const shortMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

/** Tailwind text colour for a signed figure; neutral at exactly zero. */
export const toneFor = (value: number | null | undefined) => {
  if (value === null || value === undefined || value === 0) return "text-term-muted";
  return value > 0 ? "text-term-gain" : "text-term-loss";
};

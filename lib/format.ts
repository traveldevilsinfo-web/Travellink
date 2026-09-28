/** 842 → "842", 1_250 → "1.3K", 12_400 → "12K", 2_300_000 → "2.3M". */
export const compactNumber = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`
  : n >= 10_000 ? `${Math.round(n / 1000)}K`
  : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '')}K`
  : String(n)

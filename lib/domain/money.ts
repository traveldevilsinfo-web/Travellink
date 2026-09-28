import { AppError } from '@/lib/errors'

/** Integer paise (₹1 = 100). Never a float. */
export type Paise = number

function assertPaise(v: number): void {
  if (!Number.isSafeInteger(v) || v < 0) throw new AppError('invalid_amount', `Not a non-negative integer paise: ${v}`)
}

/**
 * amount × pct / 100, rounded half-up to the paisa.
 * pct mirrors numeric(5,2) in the DB (e.g. 0.5, 18, 12.25) and is converted to integer hundredths
 * so the math itself runs in bigint, never in floating point.
 */
export function pct(amount: Paise, percent: number): Paise {
  assertPaise(amount)
  const hundredths = Math.round(percent * 100)
  if (!Number.isFinite(percent) || percent < 0 || percent > 100 || Math.abs(hundredths - percent * 100) > 1e-6) {
    throw new AppError('invalid_pct', `Percent must be 0–100 with at most 2 decimals: ${percent}`)
  }
  const result = (BigInt(amount) * BigInt(hundredths) + 5000n) / 10000n
  return Number(result)
}

export function rupeesToPaise(rupees: number): Paise {
  const p = Math.round(rupees * 100)
  assertPaise(p)
  return p
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 })

export function formatINR(amount: Paise): string {
  assertPaise(amount)
  return inr.format(amount / 100)
}

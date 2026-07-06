// Stripe's standard US card processing fee: 2.9% + $0.30 per successful charge.
// https://stripe.com/pricing
export const STRIPE_PERCENT = 0.029;
export const STRIPE_FIXED_CENTS = 30;

export interface CardFeeBreakdown {
  /** The membership tier price, in cents (what SASA wants to net). */
  baseCents: number;
  /** The surcharge added to cover Stripe's cut, in cents. */
  feeCents: number;
  /** What the member is actually charged, in cents. */
  totalCents: number;
}

/**
 * Grosses up a base amount so that, after Stripe deducts its fee from the
 * total charge, SASA nets `baseCents`.
 *
 * Stripe takes its fee on the *total* charge (including the surcharge), so a
 * flat percentage add-on would under-recover. Solving
 *   total - (total * PERCENT + FIXED) = base
 * gives total = (base + FIXED) / (1 - PERCENT).
 */
export function computeCardFee(baseCents: number): CardFeeBreakdown {
  const base = Math.max(0, Math.round(baseCents));
  const totalCents = Math.round(
    (base + STRIPE_FIXED_CENTS) / (1 - STRIPE_PERCENT)
  );
  return { baseCents: base, feeCents: totalCents - base, totalCents };
}

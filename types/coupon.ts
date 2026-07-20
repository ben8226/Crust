/** Coupon / promo codes stored in Redis as `coupons`. */

export type CouponDiscountType = "percent" | "fixed";

export interface Coupon {
  id: string;
  /** Normalized uppercase code, e.g. "SPRING10" */
  code: string;
  type: CouponDiscountType;
  /** Percent 1–100, or dollar amount for fixed */
  value: number;
  createdAt: string;
  active?: boolean;
}

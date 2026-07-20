import type { Coupon, CouponDiscountType } from "@/types/coupon";

export function normalizeCouponCode(code: string): string {
  return (code || "").trim().toUpperCase();
}

/**
 * Calculate discount dollars for a subtotal.
 * Percentage discounts are rounded UP to the nearest whole dollar.
 */
export function calculateCouponDiscount(
  subtotal: number,
  type: CouponDiscountType,
  value: number
): number {
  if (!Number.isFinite(subtotal) || subtotal <= 0) return 0;
  if (!Number.isFinite(value) || value <= 0) return 0;

  if (type === "percent") {
    const raw = subtotal * (value / 100);
    return Math.min(subtotal, Math.ceil(raw));
  }

  return Math.min(subtotal, Math.round(value * 100) / 100);
}

export function applyCouponToTotal(
  subtotal: number,
  coupon: Pick<Coupon, "type" | "value">
): { discount: number; total: number } {
  const discount = calculateCouponDiscount(subtotal, coupon.type, coupon.value);
  return {
    discount,
    total: Math.max(0, Math.round((subtotal - discount) * 100) / 100),
  };
}

export function formatCouponLabel(coupon: Pick<Coupon, "type" | "value" | "code">): string {
  if (coupon.type === "percent") {
    return `${coupon.code} (${coupon.value}% off)`;
  }
  return `${coupon.code} ($${coupon.value.toFixed(2)} off)`;
}

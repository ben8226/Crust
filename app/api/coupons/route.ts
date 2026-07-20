import { NextResponse } from "next/server";
import { addCoupon, getCoupons } from "@/lib/db";
import { normalizeCouponCode } from "@/lib/coupon";
import type { CouponDiscountType } from "@/types/coupon";

export async function GET() {
  try {
    const coupons = await getCoupons();
    return NextResponse.json(coupons, { status: 200 });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = normalizeCouponCode(typeof body?.code === "string" ? body.code : "");
    const type = body?.type as CouponDiscountType;
    const value = Number(body?.value);

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required." }, { status: 400 });
    }
    if (type !== "percent" && type !== "fixed") {
      return NextResponse.json({ error: "Choose percentage or dollar amount off." }, { status: 400 });
    }
    if (!Number.isFinite(value) || value <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than 0." }, { status: 400 });
    }
    if (type === "percent" && value > 100) {
      return NextResponse.json({ error: "Percentage cannot exceed 100." }, { status: 400 });
    }

    const coupon = await addCoupon({ code, type, value, active: true });
    return NextResponse.json(coupon, { status: 201 });
  } catch (error) {
    console.error("Error creating coupon:", error);
    const message = error instanceof Error ? error.message : "Failed to create coupon";
    const status = message.includes("already exists") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

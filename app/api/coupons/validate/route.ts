import { NextResponse } from "next/server";
import { getCouponByCode } from "@/lib/db";
import { applyCouponToTotal, normalizeCouponCode } from "@/lib/coupon";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const code = normalizeCouponCode(typeof body?.code === "string" ? body.code : "");
    const subtotal = Number(body?.subtotal);

    if (!code) {
      return NextResponse.json({ error: "Enter a coupon code." }, { status: 400 });
    }
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      return NextResponse.json({ error: "Invalid subtotal." }, { status: 400 });
    }

    const coupon = await getCouponByCode(code);
    if (!coupon) {
      return NextResponse.json({ error: "Invalid or inactive coupon code." }, { status: 404 });
    }

    const { discount, total } = applyCouponToTotal(subtotal, coupon);

    return NextResponse.json(
      {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount,
        total,
        subtotal,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error validating coupon:", error);
    return NextResponse.json({ error: "Failed to validate coupon" }, { status: 500 });
  }
}

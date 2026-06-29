import { NextResponse } from "next/server";
import { getOrders, getSpecialEvent, setSpecialEvent } from "@/lib/db";
import {
  countSpecialEventSoldByProduct,
  getSpecialEventProductIds,
  isSpecialEventToday,
} from "@/lib/special-event";
import type { SpecialEventConfig } from "@/types/special-event";

export async function GET() {
  try {
    const config = await getSpecialEvent();
    if (!config) {
      return NextResponse.json(null, { status: 200 });
    }

    const productIds = getSpecialEventProductIds(config);
    const orders = await getOrders();
    const soldByProduct = countSpecialEventSoldByProduct(orders, config.date, productIds);
    const remainingByProduct = Object.fromEntries(
      productIds.map((id) => [
        id,
        Math.max(0, (config.productQuantities[id] ?? 0) - (soldByProduct[id] ?? 0)),
      ])
    );

    return NextResponse.json(
      { ...config, soldByProduct, remainingByProduct, isActiveToday: isSpecialEventToday(config) },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching special event:", error);
    return NextResponse.json({ error: "Failed to fetch special event" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const date = typeof body?.date === "string" ? body.date.trim() : "";

    if (!date) {
      await setSpecialEvent(null);
      return NextResponse.json({ success: true, cleared: true }, { status: 200 });
    }

    const rawQuantities = body?.productQuantities;
    if (!rawQuantities || typeof rawQuantities !== "object") {
      return NextResponse.json({ error: "Select at least one bread type with a quantity." }, { status: 400 });
    }

    const productQuantities: Record<string, number> = {};
    for (const [productId, qty] of Object.entries(rawQuantities as Record<string, unknown>)) {
      const maxQuantity = Number(qty);
      if (!Number.isFinite(maxQuantity) || maxQuantity < 1) {
        return NextResponse.json(
          { error: "Each selected bread must have a max quantity of at least 1." },
          { status: 400 }
        );
      }
      productQuantities[productId] = Math.floor(maxQuantity);
    }

    if (Object.keys(productQuantities).length === 0) {
      return NextResponse.json({ error: "Select at least one bread type." }, { status: 400 });
    }

    const config: SpecialEventConfig = {
      date,
      productQuantities,
    };

    await setSpecialEvent(config);
    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error("Error saving special event:", error);
    return NextResponse.json({ error: "Failed to save special event" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { getOrders } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: { productId: string } }
) {
  try {
    const orders = await getOrders();
    const productId = params.productId;

    const normalize = (value: string | undefined) => value || "";

    const reviews = orders.flatMap((order) =>
      (order.items || [])
        .map((item) => ({
          review: normalize(item.review),
          rating: typeof item.rating === "number" ? item.rating : undefined,
          productId: item.product.id,
          productName: item.product.name,
          orderId: order.id,
          orderDate: order.date,
          pickupDate: order.pickupDate,
          pickupTime: order.pickupTime,
        }))
        .filter(
          (entry) =>
            entry.productId === productId &&
            (entry.review.trim().length > 0 || typeof entry.rating === "number")
        )
    );

    reviews.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());

    return NextResponse.json(reviews, { status: 200 });
  } catch (error) {
    console.error("Error fetching product reviews:", error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}


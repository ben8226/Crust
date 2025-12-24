import { NextResponse } from "next/server";
import { getOrderById, updateOrder, deleteOrder } from "@/lib/db";
import { Order } from "@/types/product";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getOrderById(params.id);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(order, { status: 200 });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates: Partial<Order> & {
      itemReviews?: Record<number, string>;
      itemRatings?: Record<number, number>;
    } = {};

    // Allow updating completed status
    if (typeof body.completed === "boolean") {
      updates.completed = body.completed;
      if (body.completed) {
        updates.completedDate = new Date().toISOString();
      } else {
        updates.completedDate = undefined;
      }
    }

    // Allow updating overall review
    if (typeof body.review === "string") {
      updates.review = body.review;
    }

    // Allow updating item-level reviews
    if (body.itemReviews && typeof body.itemReviews === "object") {
      const clean: Record<number, string> = {};
      Object.entries(body.itemReviews).forEach(([k, v]) => {
        const idx = Number(k);
        if (!Number.isNaN(idx) && typeof v === "string") {
          clean[idx] = v;
        }
      });
      if (Object.keys(clean).length > 0) {
        updates.itemReviews = clean;
      }
    }

    // Allow updating item-level ratings (1-5)
    if (body.itemRatings && typeof body.itemRatings === "object") {
      const clean: Record<number, number> = {};
      Object.entries(body.itemRatings).forEach(([k, v]) => {
        const idx = Number(k);
        const rating = typeof v === "number" ? v : Number(v);
        if (!Number.isNaN(idx) && Number.isFinite(rating) && rating >= 1 && rating <= 5) {
          clean[idx] = rating;
        }
      });
      if (Object.keys(clean).length > 0) {
        updates.itemRatings = clean;
      }
    }

    const updatedOrder = await updateOrder(params.id, updates);

    if (!updatedOrder) {
      return NextResponse.json(
        { error: "Order not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteOrder(params.id);

    if (!success) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Failed to delete order" },
      { status: 500 }
    );
  }
}

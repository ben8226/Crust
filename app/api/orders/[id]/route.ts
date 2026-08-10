import { NextResponse } from "next/server";
import { getOrderById, updateOrder, deleteOrder } from "@/lib/db";
import { Order } from "@/types/product";
import {
  sendReviewSavedNotificationEmail,
  shouldSendReviewNotification,
} from "@/lib/email";

function formatPhoneForStorage(phone: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return (phone || "").trim();
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

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
    const body = (await request.json()) as Record<string, unknown>;
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

    if (typeof body.cancelled === "boolean") {
      updates.cancelled = body.cancelled;
      if (body.cancelled) {
        updates.cancelledDate = new Date().toISOString();
      } else {
        updates.cancelledDate = undefined;
      }
    }

    // Allow updating customer info (e.g. from Admin Customers tab)
    if (typeof body.customerName === "string" && body.customerName.trim()) {
      updates.customerName = body.customerName.trim();
    }
    if (typeof body.phone === "string" && body.phone.trim()) {
      updates.phone = formatPhoneForStorage(body.phone);
    }
    if (typeof body.email === "string") {
      updates.email = body.email.trim() || undefined;
    }

    if (typeof body.pickupDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.pickupDate.trim())) {
      updates.pickupDate = body.pickupDate.trim();
    }
    if (typeof body.pickupTime === "string" && body.pickupTime.trim()) {
      updates.pickupTime = body.pickupTime.trim();
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

    if (shouldSendReviewNotification(body)) {
      sendReviewSavedNotificationEmail(updatedOrder, body).catch((err) =>
        console.error("Review notification email failed:", err)
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

import { NextResponse } from "next/server";
import { saveOrder, getOrders } from "@/lib/db";
import { Order } from "@/types/product";
import { sendCustomerConfirmation, sendStoreOwnerNotification } from "@/lib/sms";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "customerName",
      "phone",
      "items",
      "total",
    ];

    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate items array
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required and must not be empty" },
        { status: 400 }
      );
    }

    // Create order object
    const order: Order = {
      id: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      items: body.items,
      customerName: body.customerName,
      phone: body.phone,
      total: body.total,
      date: new Date().toISOString(),
      paymentMethod: body.paymentMethod || "cash", // Default to cash if not provided
      pickupDate: body.pickupDate,
      pickupTime: body.pickupTime,
    };

    // Save order
    await saveOrder(order);

    // Send SMS notifications (non-blocking)
    try {
      await Promise.all([
        sendCustomerConfirmation(order),
        sendStoreOwnerNotification(order),
      ]);
    } catch (smsError) {
      // Log but don't fail the order if SMS fails
      console.error("SMS notification error (order still saved):", smsError);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const orders = await getOrders();
    return NextResponse.json(orders, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}


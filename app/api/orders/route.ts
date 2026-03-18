import { NextResponse } from "next/server";
import { saveOrder, getOrders, validatePickupSlot } from "@/lib/db";
import { Order } from "@/types/product";
import { sendOrderConfirmationEmail } from "@/lib/email";

/** Normalize phone to 10 digits, then format as +1 (XXX) XXX-XXXX for storage. */
function formatPhoneForStorage(phone: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return (phone || "").trim(); // leave unchanged if not 10-digit US
  return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    const requiredFields = [
      "customerName",
      "phone",
      "email",
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

    // Validate pickup date and time if provided (re-check in case config changed during checkout)
    if (body.pickupDate && body.pickupTime) {
      const validation = await validatePickupSlot(body.pickupDate, body.pickupTime);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error },
          { status: 400 }
        );
      }
    }

    // Generate a 5-character alphanumeric order ID
    const generateOrderId = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters like 0, O, 1, I
      let id = '';
      for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return id;
    };

    // Create order object (store phone in +1 (XXX) XXX-XXXX format)
    const order: Order = {
      id: generateOrderId(),
      items: body.items,
      customerName: body.customerName,
      phone: formatPhoneForStorage(body.phone),
      total: body.total,
      date: new Date().toISOString(),
      paymentMethod: body.paymentMethod || "cash", // Default to cash if not provided
      pickupDate: body.pickupDate,
      pickupTime: body.pickupTime,
      email: body.email, // Optional email for order confirmation
      heardAboutUs: body.heardAboutUs,
    };

    // Save order
    try {
      await saveOrder(order);
      console.log(`✓ Order ${order.id} saved successfully`);
    } catch (saveError) {
      console.error("✗ Failed to save order to database:", saveError);
      // Return error with details for debugging
      return NextResponse.json(
        { 
          error: "Failed to save order to database",
          details: saveError instanceof Error ? saveError.message : String(saveError)
        },
        { status: 500 }
      );
    }



    // Send email confirmation (non-blocking)
    try {
      await sendOrderConfirmationEmail(order);
    } catch (emailError) {
      // Log but don't fail the order if email fails
      console.error("Email notification error (order still saved):", emailError);
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { 
        error: "Failed to create order",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phoneParam = searchParams.get("phone");

    const normalizePhone = (value: string) => value.replace(/\D/g, "");

    const orders = await getOrders();
    let filtered = orders;

    if (phoneParam) {
      const target = normalizePhone(phoneParam);
      filtered = orders.filter((order) => normalizePhone(order.phone) === target);
    }

    const sorted = [...filtered].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return NextResponse.json(sorted, { status: 200 });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}


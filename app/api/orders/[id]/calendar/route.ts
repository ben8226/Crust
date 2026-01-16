import { getOrderById, getProducts } from "@/lib/db";
import { NextResponse } from "next/server";
import { Product } from "@/types/product";

const TIME_ZONE = "America/Chicago";

function parsePickupTime(time?: string | null): { hour: number; minute: number } | null {
  if (!time) return null;
  const trimmed = time.trim();
  // Examples: "10:00 AM", "2:30 PM"
  const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const ampm = match[3].toUpperCase();
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 1 || hour > 12) return null;
  if (minute < 0 || minute > 59) return null;

  // Convert to 24h
  if (ampm === "AM") {
    if (hour === 12) hour = 0;
  } else {
    if (hour !== 12) hour += 12;
  }

  return { hour, minute };
}

function escapeIcsText(input: string): string {
  return input
    .replaceAll("\\", "\\\\")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
    .replaceAll("\r\n", "\\n")
    .replaceAll("\n", "\\n");
}

function formatIcsUtc(date: Date): string {
  // YYYYMMDDTHHMMSSZ
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!order.pickupDate || !order.pickupTime) {
      return NextResponse.json(
        { error: "Order does not have a pickup date/time" },
        { status: 400 }
      );
    }

    const [y, m, d] = order.pickupDate.split("-").map((x) => Number(x));
    if (![y, m, d].every((n) => Number.isFinite(n))) {
      return NextResponse.json({ error: "Invalid pickup date" }, { status: 400 });
    }

    const hm = parsePickupTime(order.pickupTime);
    if (!hm) {
      return NextResponse.json({ error: "Invalid pickup time" }, { status: 400 });
    }

    // Build a "wall clock" date and interpret it as Central Time, then convert to UTC
    const { fromZonedTime } = await import("date-fns-tz");
    const localWallClock = new Date(y, m - 1, d, hm.hour, hm.minute, 0);
    const dtStartUtc: Date = fromZonedTime(localWallClock, TIME_ZONE);

    // Zero-minute event: DTEND == DTSTART
    const dtEndUtc: Date = new Date(dtStartUtc.getTime());

    const dtstamp = formatIcsUtc(new Date());
    const dtstart = formatIcsUtc(dtStartUtc);
    const dtend = formatIcsUtc(dtEndUtc);

    // Get all products to resolve bread names
    const allProducts = await getProducts();
    const breadNameMap = new Map<string, string>();
    (allProducts || []).forEach((p: Product) => breadNameMap.set(p.id, p.name));

    const getBreadName = (breadId: string): string => {
      return breadNameMap.get(breadId) || breadId;
    };

    const pickupAddress = (process.env.NEXT_PUBLIC_PICKUP_ADDRESS || "").trim();
    
    // Extract first name from customer name
    const firstName = order.customerName.split(" ")[0] || order.customerName;
    
    // Build items list for summary (concise format)
    const itemsList = order.items.map((item) => {
      const slicing = item.cut ? " (sliced)" : "";
      return `${item.product.name} × ${item.quantity}${slicing}`;
    }).join(", ");
    
    const summary = `${firstName} - ${itemsList}`;
    
    // Build detailed description with order items
    const descriptionLines: string[] = [];
    
    descriptionLines.push(`Payment: ${order.paymentMethod === "venmo" ? "Venmo (pre-pay)" : "Cash (at pickup)"}`);
    descriptionLines.push("");
    descriptionLines.push("Items:");
    
    order.items.forEach((item) => {
      const itemPrice = item.product.price * item.quantity;
      const slicingFee = item.cut ? item.quantity : 0;
      const totalItemPrice = itemPrice + slicingFee;
      const slicing = item.cut ? " (pre-sliced)" : "";
      descriptionLines.push(`- ${item.product.name} × ${item.quantity}${slicing} - $${totalItemPrice.toFixed(2)}`);
      
      // Add selected breads for mini/half loaf boxes
      if (item.selectedBreads && item.selectedBreads.length > 0) {
        const breadNames = item.selectedBreads.map((id) => getBreadName(id));
        descriptionLines.push(`  Box picks: ${breadNames.join(", ")}`);
      }
    });
    
    descriptionLines.push("");
    descriptionLines.push(`Total: $${order.total.toFixed(2)}`);
    descriptionLines.push("");
    descriptionLines.push(`Order #: ${order.id}`);
    descriptionLines.push("");
    descriptionLines.push(`Pickup: ${order.pickupDate} ${order.pickupTime} (Central Time)`);

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Crust + Culture Microbakery//Order Pickup//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${escapeIcsText(`${order.id}@crustandculture.shop`)}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      pickupAddress ? `LOCATION:${escapeIcsText(pickupAddress)}` : "",
      `DESCRIPTION:${escapeIcsText(descriptionLines.join("\n"))}`,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ]
      .filter(Boolean)
      .join("\r\n");

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="order-${order.id}.ics"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating calendar invite:", error);
    return NextResponse.json({ error: "Failed to generate calendar invite" }, { status: 500 });
  }
}



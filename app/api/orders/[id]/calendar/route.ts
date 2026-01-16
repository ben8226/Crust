import { getOrderById } from "@/lib/db";
import { NextResponse } from "next/server";

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

    const pickupAddress = (process.env.NEXT_PUBLIC_PICKUP_ADDRESS || "").trim();
    const summary = "Crust + Culture Pickup";
    const descriptionLines = [
      `Order #${order.id}`,
      `Name: ${order.customerName}`,
      `Phone: ${order.phone}`,
      `Payment: ${order.paymentMethod === "venmo" ? "Venmo (pre-pay)" : "Cash (at pickup)"}`,
      `Total: $${order.total.toFixed(2)}`,
      "",
      `Pickup: ${order.pickupDate} ${order.pickupTime} (Central Time)`,
    ];

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



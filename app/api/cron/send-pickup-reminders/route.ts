import { NextResponse } from "next/server";
import { getOrders, updateOrder } from "@/lib/db";
import { sendSms } from "@/lib/sms";
const PICKUP_TIMEZONE = process.env.PICKUP_TIMEZONE || "America/Chicago";

/** Get today's date (YYYY-MM-DD) in the pickup timezone */
function getTodayInPickupTz(): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: PICKUP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  const day = parts.find((p) => p.type === "day")?.value ?? "";
  return `${year}-${month}-${day}`;
}

export async function GET(request: Request) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>. Also allow manual trigger with ?secret=...
  const authHeader = request.headers.get("authorization");
  const url = new URL(request.url);
  const secretParam = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/);
    const isValid = bearerMatch?.[1] === cronSecret || secretParam === cronSecret;
    if (!isValid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const today = getTodayInPickupTz();
    const orders = await getOrders();

    const toRemind = orders.filter(
      (o) =>
        o.pickupDate === today &&
        o.phone &&
        !o.cancelled &&
        !o.completed &&
        !o.reminderSentAt
    );

    const pickupAddress = (process.env.NEXT_PUBLIC_PICKUP_ADDRESS || "").trim();
    const storeName = "Crust + Culture";
    // Used to build absolute URLs that work in SMS clients.
    // NEXT_PUBLIC_BASE_URL should be set in production (e.g., https://yourdomain.com).
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
    const myAccountUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/my-account` : "";

    const results: { orderId: string; success: boolean; error?: string }[] = [];

    for (const order of toRemind) {
      const time = order.pickupTime || "your scheduled time";
      let message = ` ${storeName} reminder: \n\n Your order is ready for pickup today at ${time} \n\n `;
      //let message = `${storeName} order is ready for pickup today at ${time}.`;
      if (pickupAddress) {
        message += ` Address: ${pickupAddress}`;
      }
      message += "\n\nReply STOP to opt-out.";
      if (myAccountUrl) {
        message += `\n\nMy account: ${myAccountUrl}`;
      }

      const result = await sendSms(order.phone, message, {
        sender: storeName,
      });

      if (result.success) {
        await updateOrder(order.id, {
          reminderSentAt: new Date().toISOString(),
        });
        results.push({ orderId: order.id, success: true });
      } else {
        results.push({
          orderId: order.id,
          success: false,
          error: result.error,
        });
      }

      // Rate limit: Textbelt recommends 1-2 SMS per second
      await new Promise((r) => setTimeout(r, 600));
    }

    return NextResponse.json({
      date: today,
      sent: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error) {
    console.error("Send pickup reminders error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send reminders" },
      { status: 500 }
    );
  }
}

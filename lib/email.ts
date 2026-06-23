import { Resend } from "resend";
import { CartItem, Order, Product } from "@/types/product";
import { formatPickupDisplay } from "@/lib/date";
import { getProducts } from "@/lib/db";

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatPickup(order: Order): string {
  if (!order.pickupDate && !order.pickupTime) return "TBD";
  const date =
    order.pickupDate
      ? formatPickupDisplay(order.pickupDate, { weekday: "short", month: "short", day: "numeric" }) ||
        order.pickupDate
      : "TBD";
  const time = order.pickupTime || "TBD";
  return `${date} @ ${time}`;
}

function formatPayment(order: Order): string {
  return order.paymentMethod === "venmo" ? "Venmo (pre-pay)" : "Cash (at pickup)";
}

async function buildBreadNameLookup(): Promise<Map<string, string>> {
  try {
    const products = await getProducts();
    const map = new Map<string, string>();
    (products || []).forEach((p: Product) => map.set(p.id, p.name));
    return map;
  } catch {
    return new Map();
  }
}

function buildHtml(order: Order, breadNames: Map<string, string>): string {
  const storeName = "Crust + Culture Microbakery";

  const itemsHtml = order.items
    .map((item) => {
      const baseLine = `${escapeHtml(item.product.name)} × ${item.quantity}`;
      const priceLine = `$${(item.product.price * item.quantity + (item.cut ? item.quantity : 0)).toFixed(2)}`;
      const picks =
        item.selectedBreads && item.selectedBreads.length > 0
          ? `<div style="margin:6px 0 0 0; color:#555; font-size:12px;">
              <div style="font-weight:600; margin-bottom:4px;">Box picks:</div>
              <ul style="margin:0; padding-left:18px;">
                ${item.selectedBreads
                  .map((id) => `<li>${escapeHtml(breadNames.get(id) || id)}</li>`)
                  .join("")}
              </ul>
            </div>`
          : "";
      const slicing = item.cut ? `<span style="color:#b45309; font-weight:600;"> (pre-sliced)</span>` : "";
      return `
        <tr>
          <td style="padding:10px 0; border-bottom:1px solid #eee;">
            <div style="font-weight:600;">${baseLine}${slicing}</div>
            ${picks}
          </td>
          <td style="padding:10px 0; border-bottom:1px solid #eee; text-align:right; white-space:nowrap;">
            ${priceLine}
          </td>
        </tr>
      `;
    })
    .join("");

  return `
    <div style="font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111;">
      <div style="max-width:640px; margin:0 auto; padding:24px;">
        <h1 style="margin:0 0 8px 0; font-size:22px;">Order Confirmed</h1>
        <p style="margin:0 0 18px 0; color:#444;">
          Thanks for your order with <strong>${storeName}</strong>!
        </p>

        <div style="background:#fafafa; border:1px solid #eee; border-radius:12px; padding:16px; margin:0 0 18px 0;">
          <div style="display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap;">
            <div>
              <div style="color:#666; font-size:12px;">Order #</div>
              <div style="font-weight:700; font-size:16px;">${escapeHtml(order.id)}</div>
            </div>
            <div>
              <div style="color:#666; font-size:12px;">Pickup</div>
              <div style="font-weight:700; font-size:16px;">${escapeHtml(formatPickup(order))}</div>
            </div>
            <div>
              <div style="color:#666; font-size:12px;">Payment</div>
              <div style="font-weight:700; font-size:16px;">${escapeHtml(formatPayment(order))}</div>
            </div>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left; color:#666; font-size:12px; padding:0 0 8px 0;">Items</th>
              <th style="text-align:right; color:#666; font-size:12px; padding:0 0 8px 0;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td style="padding:12px 0; text-align:right; font-weight:700;">Total</td>
              <td style="padding:12px 0; text-align:right; font-weight:800; white-space:nowrap;">
                $${order.total.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>

        ${order.pickupDate && order.pickupTime ? `
        <div style="margin:24px 0; text-align:center;">
          <a href="${getCalendarUrl(order.id)}" style="display:inline-block; background-color:#007AFF; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:8px; font-weight:600; font-size:16px;">
            📅 Add to Calendar
          </a>
        </div>
        ` : ""}

        ${process.env.NEXT_PUBLIC_PICKUP_ADDRESS ? `
        <div style="margin:24px 0; padding:16px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;">
          <div style="color:#666; font-size:12px; margin-bottom:8px; font-weight:600;">Pickup Location</div>
          <a href="https://maps.apple.com/?address=${encodeURIComponent(process.env.NEXT_PUBLIC_PICKUP_ADDRESS)}" style="color:#007AFF; text-decoration:none; font-size:14px; font-weight:500;">
            📍 ${escapeHtml(process.env.NEXT_PUBLIC_PICKUP_ADDRESS)}
          </a>
        </div>
        ` : ""}

        <p style="margin:18px 0 0 0; color:#555; font-size:12px;">
          If you have any questions, just reply to this email.
        </p>
      </div>
    </div>
  `;
}

function buildText(order: Order, breadNames: Map<string, string>): string {
  const lines: string[] = [];
  lines.push("Order Confirmed");
  lines.push(`Order #: ${order.id}`);
  lines.push(`Pickup: ${formatPickup(order)}`);
  lines.push(`Payment: ${formatPayment(order)}`);
  lines.push("");
  lines.push("Items:");
  order.items.forEach((item) => {
    const slice = item.cut ? " (pre-sliced)" : "";
    lines.push(`- ${item.product.name} x${item.quantity}${slice}`);
    if (item.selectedBreads && item.selectedBreads.length > 0) {
      lines.push(
        `  Box picks: ${item.selectedBreads.map((id) => breadNames.get(id) || id).join(", ")}`
      );
    }
  });
  lines.push("");
  lines.push(`Total: $${order.total.toFixed(2)}`);
  if (process.env.NEXT_PUBLIC_PICKUP_ADDRESS) {
    lines.push("");
    lines.push("Pickup Location:");
    lines.push(process.env.NEXT_PUBLIC_PICKUP_ADDRESS);
    lines.push(`Apple Maps: https://maps.apple.com/?address=${encodeURIComponent(process.env.NEXT_PUBLIC_PICKUP_ADDRESS)}`);
  }
  return lines.join("\n");
}

function getCalendarUrl(orderId: string): string {
  // Try to get base URL from environment variable
  // NEXT_PUBLIC_BASE_URL should be set in production (e.g., https://yourdomain.com)
  // VERCEL_URL is automatically set by Vercel
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 
                  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
                  "http://localhost:3000/"; // Fallback - should be set in production
  
  return `${baseUrl}/api/orders/${orderId}/calendar`;
}

/** True when PATCH body looks like a customer saved a review (overall text, item text, or item stars). */
export function shouldSendReviewNotification(body: Record<string, unknown>): boolean {
  if (typeof body.review === "string" && body.review.trim().length > 0) return true;
  if (body.itemReviews && typeof body.itemReviews === "object" && body.itemReviews !== null) {
    const vals = Object.values(body.itemReviews as Record<string, unknown>);
    if (vals.some((v) => typeof v === "string" && v.trim().length > 0)) return true;
  }
  if (body.itemRatings && typeof body.itemRatings === "object" && body.itemRatings !== null) {
    if (Object.keys(body.itemRatings as Record<string, unknown>).length > 0) return true;
  }
  return false;
}

function sampleBoxPicksHtml(item: CartItem, breadNames: Map<string, string>): string {
  const isBox = item.product.loafType === "mini" || item.product.loafType === "half";
  if (!isBox || !item.selectedBreads?.length) return "";
  const lis = item.selectedBreads
    .map((id) => `<li>${escapeHtml(breadNames.get(id) || id)}</li>`)
    .join("");
  return `
    <div style="margin:0 0 10px 0; padding:10px; background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px;">
      <div style="font-size:12px; font-weight:600; color:#555; margin-bottom:6px;">Sample box breads</div>
      <ul style="margin:0; padding-left:18px; color:#333;">${lis}</ul>
    </div>
  `;
}

function sampleBoxPicksText(item: CartItem, breadNames: Map<string, string>): string {
  const isBox = item.product.loafType === "mini" || item.product.loafType === "half";
  if (!isBox || !item.selectedBreads?.length) return "";
  const lines = item.selectedBreads.map((id) => `  - ${breadNames.get(id) || id}`);
  return `Sample box breads:\n${lines.join("\n")}\n\n`;
}

function buildReviewNotificationHtml(
  order: Order,
  body: Record<string, unknown>,
  breadNames: Map<string, string>
): string {
  const blocks: string[] = [];
  blocks.push(
    `<p style="margin:0 0 12px 0; color:#444;"><strong>Order #</strong> ${escapeHtml(order.id)}</p>`,
    `<p style="margin:0 0 18px 0; color:#444;"><strong>Customer</strong> ${escapeHtml(order.customerName || "—")}</p>`
  );

  if (typeof body.review === "string" && body.review.trim().length > 0) {
    blocks.push(
      `<h2 style="margin:16px 0 8px 0; font-size:16px;">Overall review</h2>`,
      `<p style="margin:0; white-space:pre-wrap; color:#111;">${escapeHtml(body.review.trim())}</p>`
    );
  }

  const reviewTexts =
    body.itemReviews && typeof body.itemReviews === "object" && body.itemReviews !== null
      ? (body.itemReviews as Record<string, string>)
      : {};
  const ratings =
    body.itemRatings && typeof body.itemRatings === "object" && body.itemRatings !== null
      ? (body.itemRatings as Record<string, number>)
      : {};
  const indices = new Set([...Object.keys(reviewTexts), ...Object.keys(ratings)]);

  for (const k of indices) {
    const idx = Number(k);
    if (Number.isNaN(idx)) continue;
    const item = order.items[idx];
    if (!item) continue;
    const text = (reviewTexts[k] ?? "").trim();
    const rating = ratings[k];
    const hasRating = typeof rating === "number" && rating >= 1 && rating <= 5;
    if (!text && !hasRating) continue;

    blocks.push(`<h2 style="margin:16px 0 8px 0; font-size:16px;">Product: ${escapeHtml(item.product.name)}</h2>`);
    blocks.push(sampleBoxPicksHtml(item, breadNames));
    if (hasRating) {
      blocks.push(`<p style="margin:0 0 8px 0; color:#444;"><strong>Rating</strong> ${rating} / 5</p>`);
    }
    if (text) {
      blocks.push(`<p style="margin:0; white-space:pre-wrap; color:#111;">${escapeHtml(text)}</p>`);
    }
  }

  return `
    <div style="font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111;">
      <div style="max-width:640px; margin:0 auto; padding:24px;">
        <h1 style="margin:0 0 8px 0; font-size:20px;">New customer review</h1>
        ${blocks.join("")}
      </div>
    </div>
  `;
}

function buildReviewNotificationText(
  order: Order,
  body: Record<string, unknown>,
  breadNames: Map<string, string>
): string {
  const lines: string[] = ["New customer review", "", `Order #: ${order.id}`, `Customer: ${order.customerName || "—"}`, ""];

  if (typeof body.review === "string" && body.review.trim().length > 0) {
    lines.push("Overall review", body.review.trim(), "");
  }

  const reviewTexts =
    body.itemReviews && typeof body.itemReviews === "object" && body.itemReviews !== null
      ? (body.itemReviews as Record<string, string>)
      : {};
  const ratings =
    body.itemRatings && typeof body.itemRatings === "object" && body.itemRatings !== null
      ? (body.itemRatings as Record<string, number>)
      : {};
  const indices = new Set([...Object.keys(reviewTexts), ...Object.keys(ratings)]);

  for (const k of indices) {
    const idx = Number(k);
    if (Number.isNaN(idx)) continue;
    const item = order.items[idx];
    if (!item) continue;
    const text = (reviewTexts[k] ?? "").trim();
    const rating = ratings[k];
    const hasRating = typeof rating === "number" && rating >= 1 && rating <= 5;
    if (!text && !hasRating) continue;

    lines.push(`Product: ${item.product.name}`);
    const picksText = sampleBoxPicksText(item, breadNames);
    if (picksText) lines.push(picksText.trimEnd());
    if (hasRating) lines.push(`Rating: ${rating} / 5`);
    if (text) lines.push(text);
    lines.push("");
  }

  return lines.join("\n");
}

function getAdminEmailRecipients(): string[] {
  const bcc1 = (process.env.RESEND_BCC_EMAIL || "").trim();
  const bcc2 = (process.env.RESEND_BCC_EMAIL_2 || "").trim();
  return [bcc1, bcc2].filter(Boolean);
}

/** Public URL Resend should POST inbound `email.received` events to. */
export function getResendInboundWebhookUrl(): string | undefined {
  const baseUrl =
    (process.env.NEXT_PUBLIC_BASE_URL || "").trim() ||
    (process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!baseUrl) return undefined;
  return `${baseUrl.replace(/\/$/, "")}/api/resend/inbound`;
}

/** Forward a customer reply received via Resend Inbound to admin inboxes. */
export async function forwardInboundEmailToAdmins(emailId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const recipients = getAdminEmailRecipients();

  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured. Skipping inbound email forward.");
    return;
  }
  if (!from) {
    console.warn("RESEND_FROM not configured. Skipping inbound email forward.");
    return;
  }
  if (recipients.length === 0) {
    console.warn("RESEND_BCC_EMAIL / RESEND_BCC_EMAIL_2 not configured. Skipping inbound email forward.");
    return;
  }

  const resend = new Resend(apiKey);
  const { data: email, error: getError } = await resend.emails.receiving.get(emailId);
  if (getError || !email) {
    throw new Error(getError?.message || "Failed to load inbound email");
  }

  const subject = email.subject?.trim() || "(no subject)";
  const customerFrom = email.from?.trim() || "unknown sender";
  const bodyHtml = email.html?.trim();
  const bodyText = email.text?.trim();

  const { error: sendError } = await resend.emails.send({
    from,
    to: recipients,
    replyTo: customerFrom,
    subject: `[Customer reply] ${subject}`,
    html: `
      <div style="font-family:ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:#111;">
        <p style="margin:0 0 8px 0;"><strong>Customer reply from:</strong> ${escapeHtml(customerFrom)}</p>
        <p style="margin:0 0 16px 0;"><strong>Original subject:</strong> ${escapeHtml(subject)}</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0;" />
        ${bodyHtml || `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(bodyText || "(empty message)")}</pre>`}
      </div>
    `,
    text: [
      `Customer reply from: ${customerFrom}`,
      `Original subject: ${subject}`,
      "",
      bodyText || "(empty message)",
    ].join("\n"),
  });

  if (sendError) {
    throw new Error(sendError.message || "Failed to forward inbound email");
  }
}

export async function sendReviewSavedNotificationEmail(
  order: Order,
  body: Record<string, unknown>
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const recipients = getAdminEmailRecipients();

  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured. Skipping review notification email.");
    return;
  }
  if (!from) {
    console.warn("RESEND_FROM not configured. Skipping review notification email.");
    return;
  }
  if (recipients.length === 0) {
    console.warn("RESEND_BCC_EMAIL / RESEND_BCC_EMAIL_2 not configured. Skipping review notification email.");
    return;
  }

  const breadNames = await buildBreadNameLookup();
  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: recipients,
    subject: `New customer review — Order ${order.id}`,
    html: buildReviewNotificationHtml(order, body, breadNames),
    text: buildReviewNotificationText(order, body, breadNames),
  });
}

export async function sendOrderConfirmationEmail(order: Order): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey) {
    console.warn("RESEND_API_KEY not configured. Skipping order confirmation email.");
    return;
  }

  if (!from) {
    console.warn("RESEND_FROM not configured. Skipping order confirmation email.");
    return;
  }

  const to = (order.email || "").trim();
  if (!to) return;

  // Collect BCC recipients from environment variables
  const bccEmails = getAdminEmailRecipients();

  const breadNames = await buildBreadNameLookup();
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    bcc: bccEmails.length > 0 ? bccEmails : undefined,
    subject: `Order Confirmation - ${order.id}`,
    html: buildHtml(order, breadNames),
    text: buildText(order, breadNames),
  });
}





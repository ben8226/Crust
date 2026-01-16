import { Resend } from "resend";
import { Order, Product } from "@/types/product";
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
  return lines.join("\n");
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

  const breadNames = await buildBreadNameLookup();
  const resend = new Resend(apiKey);

  await resend.emails.send({
    from,
    to,
    subject: `Order Confirmation - ${order.id}`,
    html: buildHtml(order, breadNames),
    text: buildText(order, breadNames),
  });
}





import type { Order, ReminderReply } from "@/types/product";
import type { TextReplyEntry } from "@/types/text-reply";

/** Digits-only US phone key (11-digit numbers starting with 1 → 10 digits). */
export function normalizePhoneDigits(phone: string): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits;
}

function orderHasOutboundTextId(order: Order, textIdKey: string): boolean {
  if (order.reminderTextId && String(order.reminderTextId) === textIdKey) return true;
  return (order.reminderReplies || []).some(
    (r) => r.textId && String(r.textId) === textIdKey
  );
}

/**
 * Find the order a reminder SMS reply belongs to.
 * 1. Explicit order id (Textbelt webhookData)
 * 2. Exact match on reminderTextId or an outbound reply textId
 * 3. Fallback: same phone, most recent reminderSentAt
 */
export function findOrderForSmsReply(
  orders: Order[],
  textId: string,
  fromNumber: string,
  orderIdHint?: string
): Order | undefined {
  const hint = String(orderIdHint || "").trim();
  if (hint) {
    const byHint = orders.find((o) => o.id === hint);
    if (byHint) return byHint;
  }

  const textIdKey = String(textId || "").trim();
  if (textIdKey) {
    const byTextId = orders.find((o) => orderHasOutboundTextId(o, textIdKey));
    if (byTextId) return byTextId;
  }

  const phone = normalizePhoneDigits(fromNumber);
  if (!phone) return undefined;

  const candidates = orders.filter(
    (o) => o.reminderSentAt && normalizePhoneDigits(o.phone) === phone
  );
  candidates.sort(
    (a, b) =>
      new Date(b.reminderSentAt as string).getTime() -
      new Date(a.reminderSentAt as string).getTime()
  );
  return candidates[0];
}

export function toReminderReply(entry: TextReplyEntry): ReminderReply {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    fromNumber: entry.fromNumber,
    text: entry.text,
    direction: "customer",
    textId: entry.textId,
  };
}

export function isCustomerReminderReply(reply: ReminderReply): boolean {
  return reply.direction !== "admin";
}

/** Merge inbox replies onto orders that do not already have them persisted. */
export function mergeRepliesOntoOrders(
  orders: Order[],
  replies: TextReplyEntry[]
): Order[] {
  if (replies.length === 0) return orders;

  const extrasByOrderId = new Map<string, ReminderReply[]>();

  for (const reply of replies) {
    const order =
      (reply.orderId && orders.find((o) => o.id === reply.orderId)) ||
      findOrderForSmsReply(orders, reply.textId, reply.fromNumber);
    if (!order) continue;

    const existing = order.reminderReplies || [];
    const alreadyOnOrder = existing.some((r) => r.id === reply.id);
    const pending = extrasByOrderId.get(order.id) || [];
    if (alreadyOnOrder || pending.some((r) => r.id === reply.id)) continue;

    extrasByOrderId.set(order.id, [...pending, toReminderReply(reply)]);
  }

  if (extrasByOrderId.size === 0) return orders;

  return orders.map((order) => {
    const extras = extrasByOrderId.get(order.id);
    if (!extras || extras.length === 0) return order;
    const merged = [...(order.reminderReplies || []), ...extras].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return { ...order, reminderReplies: merged };
  });
}

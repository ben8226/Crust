import { NextResponse } from "next/server";
import { appendTextReplyEntry, getOrders, updateOrder } from "@/lib/db";
import { findOrderForSmsReply, toReminderReply } from "@/lib/text-reply";
import type { TextReplyEntry } from "@/types/text-reply";

function verifyTextReplyWebhook(request: Request): boolean {
  const secret = (process.env.TEXT_REPLY_WEBHOOK_SECRET || "").trim();
  if (!secret) return true;
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === secret) return true;
  const auth = request.headers.get("authorization");
  const m = auth?.match(/^Bearer\s+(.+)$/i);
  if (m?.[1] === secret) return true;
  if (request.headers.get("x-webhook-secret") === secret) return true;
  return false;
}

function newReplyId(): string {
  return `TREPLY-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Normalize webhook body: expects textID, fromNumber, text (also accepts common aliases). */
function parseTextReplyPayload(data: Record<string, unknown>): {
  textId: string;
  fromNumber: string;
  text: string;
  orderIdHint?: string;
} | null {
  const textIdRaw = data.textID ?? data.textId ?? data.text_id;
  const fromRaw = data.fromNumber ?? data.from_number ?? data.from;
  const textRaw = data.text ?? data.message ?? data.body;
  const hintRaw = data.data ?? data.webhookData ?? data.orderId;
  if (fromRaw === undefined || fromRaw === null || String(fromRaw).trim() === "") return null;
  if (textRaw === undefined || textRaw === null) return null;
  const textId =
    textIdRaw === undefined || textIdRaw === null ? "" : String(textIdRaw).trim();
  const orderIdHint =
    hintRaw === undefined || hintRaw === null ? undefined : String(hintRaw).trim() || undefined;
  return {
    textId,
    fromNumber: String(fromRaw).trim(),
    text: String(textRaw),
    orderIdHint,
  };
}

async function parseRequestBody(request: Request): Promise<Record<string, unknown>> {
  const ct = (request.headers.get("content-type") || "").toLowerCase();
  const raw = await request.text();
  if (!raw.trim()) return {};

  if (ct.includes("application/json") || raw.trim().startsWith("{")) {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }

  if (ct.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(raw);
    const out: Record<string, unknown> = {};
    params.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const params = new URLSearchParams(raw);
    const out: Record<string, unknown> = {};
    params.forEach((v, k) => {
      out[k] = v;
    });
    return out;
  }
}

export async function POST(request: Request) {
  if (!verifyTextReplyWebhook(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await parseRequestBody(request);
    const parsed = parseTextReplyPayload(data);
    if (!parsed) {
      return NextResponse.json(
        { error: "Missing required fields: fromNumber, text" },
        { status: 400 }
      );
    }

    const orders = await getOrders();
    const matchedOrder = findOrderForSmsReply(
      orders,
      parsed.textId,
      parsed.fromNumber,
      parsed.orderIdHint
    );

    const entry: TextReplyEntry = {
      id: newReplyId(),
      createdAt: new Date().toISOString(),
      textId: parsed.textId,
      fromNumber: parsed.fromNumber,
      text: parsed.text,
      orderId: matchedOrder?.id,
    };

    await appendTextReplyEntry(entry);

    if (matchedOrder) {
      const existing = matchedOrder.reminderReplies || [];
      if (!existing.some((r) => r.id === entry.id)) {
        try {
          await updateOrder(matchedOrder.id, {
            reminderReplies: [toReminderReply(entry), ...existing],
          });
        } catch (attachError) {
          console.error("Failed to attach text reply to order:", attachError);
        }
      }
    }

    return NextResponse.json(
      { ok: true, id: entry.id, orderId: entry.orderId },
      { status: 200 }
    );
  } catch (error) {
    console.error("Text reply webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to store reply" },
      { status: 500 }
    );
  }
}

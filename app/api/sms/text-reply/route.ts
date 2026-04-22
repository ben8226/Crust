import { NextResponse } from "next/server";
import { appendTextReplyEntry } from "@/lib/db";
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
} | null {
  const textIdRaw = data.textID ?? data.textId ?? data.text_id;
  const fromRaw = data.fromNumber ?? data.from_number ?? data.from;
  const textRaw = data.text ?? data.message ?? data.body;
  if (textIdRaw === undefined || textIdRaw === null || String(textIdRaw).trim() === "") return null;
  if (fromRaw === undefined || fromRaw === null || String(fromRaw).trim() === "") return null;
  if (textRaw === undefined || textRaw === null) return null;
  return {
    textId: String(textIdRaw).trim(),
    fromNumber: String(fromRaw).trim(),
    text: String(textRaw),
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
        { error: "Missing required fields: textID, fromNumber, text" },
        { status: 400 }
      );
    }

    const entry: TextReplyEntry = {
      id: newReplyId(),
      createdAt: new Date().toISOString(),
      textId: parsed.textId,
      fromNumber: parsed.fromNumber,
      text: parsed.text,
    };

    await appendTextReplyEntry(entry);
    return NextResponse.json({ ok: true, id: entry.id }, { status: 200 });
  } catch (error) {
    console.error("Text reply webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to store reply" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { forwardInboundEmailToAdmins } from "@/lib/email";

type InboundWebhookEvent = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
  };
};

function parseInboundWebhookEvent(payload: string): InboundWebhookEvent {
  return JSON.parse(payload) as InboundWebhookEvent;
}

function verifyResendWebhook(request: Request, payload: string): InboundWebhookEvent {
  const webhookSecret = (process.env.RESEND_WEBHOOK_SECRET || "").trim();
  if (!webhookSecret) {
    console.warn("RESEND_WEBHOOK_SECRET not configured. Accepting inbound webhook without signature verification.");
    return parseInboundWebhookEvent(payload);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to verify inbound webhooks");
  }

  const resend = new Resend(apiKey);
  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing Svix signature headers");
  }

  return resend.webhooks.verify({
    payload,
    headers: {
      id: svixId,
      timestamp: svixTimestamp,
      signature: svixSignature,
    },
    webhookSecret,
  }) as InboundWebhookEvent;
}

export async function POST(request: Request) {
  try {
    const payload = await request.text();
    if (!payload.trim()) {
      return NextResponse.json({ error: "Empty webhook payload" }, { status: 400 });
    }

    const event = verifyResendWebhook(request, payload);
    if (event.type !== "email.received") {
      return NextResponse.json({ ok: true, ignored: event.type || "unknown" }, { status: 200 });
    }

    const emailId = event.data?.email_id;
    if (!emailId) {
      return NextResponse.json({ error: "Missing email_id in webhook payload" }, { status: 400 });
    }

    await forwardInboundEmailToAdmins(emailId);

    return NextResponse.json({ ok: true, forwarded: true, emailId }, { status: 200 });
  } catch (error) {
    console.error("Resend inbound webhook error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process inbound email" },
      { status: 500 }
    );
  }
}

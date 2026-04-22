/**
 * Absolute URL Textbelt should POST replies to (same path the app implements).
 * See https://docs.textbelt.com/ — add `replyWebhookUrl` on the /text request.
 *
 * Priority:
 * 1. TEXT_REPLY_WEBHOOK_URL — full URL if your public origin is not discoverable from other env vars
 * 2. NEXT_PUBLIC_BASE_URL, NEXT_PUBLIC_SITE_URL, or https://VERCEL_URL + /api/sms/text-reply + optional ?secret=
 */
export function getTextbeltReplyWebhookUrl(): string | undefined {
  const explicit = (process.env.TEXT_REPLY_WEBHOOK_URL || "").trim();
  if (explicit) return explicit;

  const baseUrl =
    (process.env.NEXT_PUBLIC_BASE_URL || "").trim() ||
    (process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  const webhookSecret = (process.env.TEXT_REPLY_WEBHOOK_SECRET || "").trim();
  const replyPath = `/api/sms/text-reply${webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ""}`;
  if (!baseUrl) return undefined;
  return `${baseUrl.replace(/\/$/, "")}${replyPath}`;
}

/**
 * Send SMS via Textbelt API.
 * Uses TEXTBELT_API_KEY from environment.
 * When `replyWebhookUrl` is omitted, uses getTextbeltReplyWebhookUrl() so Textbelt receives the webhook on every send.
 */
export async function sendSms(
  phone: string,
  message: string,
  options?: { sender?: string; replyWebhookUrl?: string }
): Promise<{ success: boolean; textId?: number; error?: string; quotaRemaining?: number }> {
  const apiKey = process.env.TEXTBELT_API_KEY;
  if (!apiKey) {
    console.warn("TEXTBELT_API_KEY not configured. Skipping SMS.");
    return { success: false, error: "TEXTBELT_API_KEY not configured" };
  }

  // Normalize phone: strip to digits, ensure 10-digit US format
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) {
    return { success: false, error: "Invalid US phone number" };
  }

  const replyWebhookUrl = process.env.NEXT_PUBLIC_BASE_URL + "/api/sms/text-reply";

  const body: Record<string, string> = {
    phone: digits,
    message,
    replyWebhookUrl,
    key: apiKey,
  };
  if (options?.sender) body.sender = options.sender;

  try {
    const res = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      success?: boolean;
      textId?: number;
      error?: string;
      quotaRemaining?: number;
    };
    return {
      success: !!data.success,
      textId: data.textId,
      error: data.error,
      quotaRemaining: data.quotaRemaining,
    };
  } catch (err) {
    console.error("Textbelt SMS error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send SMS",
    };
  }
}

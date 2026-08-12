/**
 * Absolute URL Textbelt should POST replies to (same path the app implements).
 * See https://docs.textbelt.com/ — add `replyWebhookUrl` on the /text request.
 *
 * Built from NEXT_PUBLIC_SITE_URL (or NEXT_PUBLIC_BASE_URL / VERCEL_URL).
 * Localhost is skipped because Textbelt cannot reach it.
 */
function isPublicHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host === "127.0.0.1" || host === "::1" || host.endsWith(".local")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function withReplyPath(baseUrl: string): string {
  const webhookSecret = (process.env.TEXT_REPLY_WEBHOOK_SECRET || "").trim();
  const replyPath = `/api/sms/text-reply${webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ""}`;
  return `${baseUrl.replace(/\/$/, "")}${replyPath}`;
}

export function getTextbeltReplyWebhookUrl(): string | undefined {
  const baseUrl =
    (process.env.NEXT_PUBLIC_SITE_URL || "").trim() ||
    (process.env.NEXT_PUBLIC_BASE_URL || "").trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  if (!baseUrl) return undefined;
  const url = withReplyPath(baseUrl);
  return isPublicHttpUrl(url) ? url : undefined;
}

/**
 * Send SMS via Textbelt API.
 * Uses TEXTBELT_API_KEY from environment.
 * When `replyWebhookUrl` is omitted, uses getTextbeltReplyWebhookUrl() so Textbelt receives the webhook on every send.
 * Textbelt's reply-webhook examples use form-urlencoded, so we send that content type.
 */
export async function sendSms(
  phone: string,
  message: string,
  options?: { sender?: string; replyWebhookUrl?: string; webhookData?: string }
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

  const replyWebhookUrl =
    options?.replyWebhookUrl !== undefined
      ? options.replyWebhookUrl.trim() || undefined
      : getTextbeltReplyWebhookUrl();

  const form = new URLSearchParams();
  form.set("phone", digits);
  form.set("message", message);
  form.set("key", apiKey);
  if (options?.sender) form.set("sender", options.sender);
  if (replyWebhookUrl) form.set("replyWebhookUrl", replyWebhookUrl);
  const webhookData = (options?.webhookData || "").trim().slice(0, 100);
  if (webhookData) form.set("webhookData", webhookData);

  if (replyWebhookUrl) {
    console.log("Textbelt replyWebhookUrl:", replyWebhookUrl);
  } else {
    console.warn(
      "Textbelt replyWebhookUrl omitted — customer replies cannot be delivered. Set NEXT_PUBLIC_SITE_URL to a public https URL."
    );
  }

  try {
    const res = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
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

/**
 * Send SMS via Textbelt API.
 * Uses TEXTBELT_API_KEY from environment.
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

  const body: Record<string, string> = {
    phone: digits,
    message,
    key: apiKey,
  };
  if (options?.sender) body.sender = options.sender;
  if (options?.replyWebhookUrl) body.replyWebhookUrl = options.replyWebhookUrl;

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

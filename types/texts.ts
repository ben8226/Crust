/** Logged row in the `texts` Redis collection (pickup reminder cron runs, etc.). */

export type TextLogSource = "pickup-reminders-cron";

/** One order row in the pickup-reminders cron JSON (includes Textbelt POST body, key redacted). */
export interface PickupReminderCronOrderResult {
  orderId: string;
  success: boolean;
  error?: string;
  textsRemaining?: number;
  textId?: number;
  /** Fields sent as JSON to `https://textbelt.com/text` (API key redacted). */
  textbeltRequest?: Record<string, string>;
}

export interface PickupReminderCronResult {
  date: string;
  sent: number;
  failed: number;
  results: PickupReminderCronOrderResult[];
}

export interface TextLogEntry {
  id: string;
  createdAt: string;
  source: TextLogSource;
  /** Successful cron JSON payload */
  result?: PickupReminderCronResult;
  /** Error message when the job failed before a normal result */
  error?: string;
}

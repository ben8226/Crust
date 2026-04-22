/** Logged row in the `texts` Redis collection (pickup reminder cron runs, etc.). */

export type TextLogSource = "pickup-reminders-cron";

export interface PickupReminderCronResult {
  date: string;
  sent: number;
  failed: number;
  results: { orderId: string; success: boolean; error?: string }[];
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

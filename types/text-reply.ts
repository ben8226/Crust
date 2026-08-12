/** One inbound SMS reply row stored in Redis under key `textReplys`. */

export interface TextReplyEntry {
  id: string;
  createdAt: string;
  /** Provider message id (e.g. Textbelt textId) */
  textId: string;
  fromNumber: string;
  text: string;
  /** Order that received the reminder this reply is associated with */
  orderId?: string;
}

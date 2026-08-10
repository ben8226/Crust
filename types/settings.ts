/** Row in the `settings` Redis collection. */

export const TEXTING_MESSAGE_SETTING_LABEL = "Texting message";
export const TEXTS_REMAINING_SETTING_LABEL = "textsRemaining";
export const REQUESTED_UPDATES_SETTING_LABEL = "Requested updates";

export interface SettingEntry {
  id: string;
  label: string;
  value: string;
  updatedAt: string;
}

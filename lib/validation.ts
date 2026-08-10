/** True when the value has at least two non-empty name parts, e.g. "John Smith" or "John S". */
export function isFullName(name: string): boolean {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  return parts.length >= 2 && parts.every((part) => part.length > 0);
}

export const FULL_NAME_REQUIRED_MESSAGE = "Full name required";

import { Order, Product } from "@/types/product";
import type {
  LegacySpecialEventConfig,
  SpecialEventConfig,
  SpecialEventPickupWindow,
} from "@/types/special-event";
import { DEFAULT_SPECIAL_EVENT_PICKUP_WINDOW } from "@/types/special-event";
import { getTodayDateInPickupTz, parseTimeToMinutes } from "@/lib/date";

export function normalizeSpecialEventConfig(
  stored: LegacySpecialEventConfig | SpecialEventConfig | null | undefined
): SpecialEventConfig | null {
  if (!stored?.date?.trim()) return null;

  if (stored.productQuantities && Object.keys(stored.productQuantities).length > 0) {
    return {
      date: stored.date,
      productQuantities: stored.productQuantities,
      pickupWindow: normalizeSpecialEventPickupWindow(stored.pickupWindow),
      updatedAt: stored.updatedAt,
    };
  }

  const legacy = stored as LegacySpecialEventConfig;
  if (legacy.productIds?.length && legacy.maxQuantity != null) {
    const productQuantities: Record<string, number> = {};
    legacy.productIds.forEach((id) => {
      productQuantities[id] = legacy.maxQuantity!;
    });
    return {
      date: stored.date,
      productQuantities,
      pickupWindow: normalizeSpecialEventPickupWindow(stored.pickupWindow),
      updatedAt: stored.updatedAt,
    };
  }

  return null;
}

export function normalizeSpecialEventPickupWindow(
  window?: SpecialEventPickupWindow | null
): SpecialEventPickupWindow {
  const startTime = window?.startTime?.trim() || DEFAULT_SPECIAL_EVENT_PICKUP_WINDOW.startTime;
  const endTime = window?.endTime?.trim() || DEFAULT_SPECIAL_EVENT_PICKUP_WINDOW.endTime;
  return { startTime, endTime };
}

export function parseSpecialEventPickupWindow(
  raw: unknown
): { valid: true; pickupWindow: SpecialEventPickupWindow } | { valid: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { valid: true, pickupWindow: DEFAULT_SPECIAL_EVENT_PICKUP_WINDOW };
  }
  const startTime = typeof (raw as SpecialEventPickupWindow).startTime === "string"
    ? (raw as SpecialEventPickupWindow).startTime.trim()
    : "";
  const endTime = typeof (raw as SpecialEventPickupWindow).endTime === "string"
    ? (raw as SpecialEventPickupWindow).endTime.trim()
    : "";
  if (!startTime || !endTime) {
    return { valid: false, error: "Pickup start and end times are required." };
  }
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  if (startMins == null || endMins == null) {
    return { valid: false, error: "Invalid pickup time format." };
  }
  if (startMins > endMins) {
    return { valid: false, error: "Pickup start time must be before end time." };
  }
  return { valid: true, pickupWindow: { startTime, endTime } };
}

export function getSpecialEventProductIds(config: SpecialEventConfig): string[] {
  return Object.keys(config.productQuantities);
}

export function countSpecialEventSoldByProduct(
  orders: Order[],
  eventDate: string,
  productIds: string[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  productIds.forEach((id) => {
    counts[id] = 0;
  });

  orders.forEach((order) => {
    if (order.cancelled || order.pickupDate !== eventDate) return;
    order.items.forEach((item) => {
      if (counts[item.product.id] !== undefined) {
        counts[item.product.id] += item.quantity;
      }
    });
  });

  return counts;
}

export function isSpecialEventToday(config: SpecialEventConfig | null): boolean {
  if (!config?.date?.trim()) return false;
  return config.date === getTodayDateInPickupTz();
}

export function buildSpecialEventBannerLines(
  products: Product[],
  config: SpecialEventConfig,
  soldByProduct: Record<string, number>
): string[] {
  return getSpecialEventProductIds(config).map((productId) => {
    const product = products.find((p) => p.id === productId);
    const name = product?.name || "Item";
    const category = product?.category?.trim();
    const label = category ? `${category}, ${name}` : name;
    const max = config.productQuantities[productId] ?? 0;
    const sold = soldByProduct[productId] ?? 0;
    const remaining = Math.max(0, max - sold);
    return `${label} — ${remaining} of ${max} available`;
  });
}

/** Max quantity a customer may order per product during a special event (2, or 1 if only one left). */
export function getSpecialEventOrderLimit(remaining: number): number {
  if (remaining <= 0) return 0;
  return Math.min(2, remaining);
}

export function validateSpecialEventOrder(
  config: SpecialEventConfig | null,
  items: { product: { id: string }; quantity: number; cut?: boolean }[],
  pickupDate: string,
  soldByProduct: Record<string, number>
): { valid: true } | { valid: false; error: string } {
  if (!config || !isSpecialEventToday(config)) {
    return { valid: false, error: "There is no special event order window open today." };
  }
  if (pickupDate !== config.date) {
    return { valid: false, error: "Pickup must be on the event date." };
  }
  if (!items.length) {
    return { valid: false, error: "Please select at least one item." };
  }

  for (const item of items) {
    if (item.cut) {
      return { valid: false, error: "Pre-sliced bread is not available for special event orders." };
    }
    const productId = item.product.id;
    const maxConfigured = config.productQuantities[productId];
    if (maxConfigured == null) {
      return { valid: false, error: "One or more items are not part of today's special event." };
    }
    const sold = soldByProduct[productId] ?? 0;
    const remaining = Math.max(0, maxConfigured - sold);
    const limit = getSpecialEventOrderLimit(remaining);
    if (!Number.isFinite(item.quantity) || item.quantity < 1) {
      return { valid: false, error: "Invalid quantity." };
    }
    if (item.quantity > limit) {
      return {
        valid: false,
        error: `You can order at most ${limit} of this item for today's event.`,
      };
    }
  }

  return { valid: true };
}

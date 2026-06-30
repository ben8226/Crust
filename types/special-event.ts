/** Admin-configured special event (stored in Redis as `specialEvent`). */

export interface SpecialEventPickupWindow {
  startTime: string;
  endTime: string;
}

export interface SpecialEventConfig {
  date: string; // YYYY-MM-DD
  /** productId -> max quantity available for that product */
  productQuantities: Record<string, number>;
  /** Pickup slots offered on the special event checkout page */
  pickupWindow?: SpecialEventPickupWindow;
  updatedAt?: string;
}

export const DEFAULT_SPECIAL_EVENT_PICKUP_WINDOW: SpecialEventPickupWindow = {
  startTime: "12:00 PM",
  endTime: "6:00 PM",
};

/** @deprecated Legacy shape — migrated on read */
export interface LegacySpecialEventConfig {
  date: string;
  productIds?: string[];
  maxQuantity?: number;
  productQuantities?: Record<string, number>;
  pickupWindow?: SpecialEventPickupWindow;
  updatedAt?: string;
}

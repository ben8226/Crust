/** Admin-configured special event (stored in Redis as `specialEvent`). */

export interface SpecialEventConfig {
  date: string; // YYYY-MM-DD
  /** productId -> max quantity available for that product */
  productQuantities: Record<string, number>;
  updatedAt?: string;
}

/** @deprecated Legacy shape — migrated on read */
export interface LegacySpecialEventConfig {
  date: string;
  productIds?: string[];
  maxQuantity?: number;
  productQuantities?: Record<string, number>;
  updatedAt?: string;
}

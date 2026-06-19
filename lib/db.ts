import { Product, Order } from "@/types/product";
import type { TextReplyEntry } from "@/types/text-reply";
import type { TextLogEntry } from "@/types/texts";
import { UpdateEntry } from "@/types/update";
import type { SettingEntry } from "@/types/settings";

/** Redis key for app settings ("Settings" table). */
const SETTINGS_REDIS_KEY = "settings";

/** Redis key for SMS / cron run logs ("Texts" table). */
const TEXTS_REDIS_KEY = "texts";
const MAX_TEXTS_ENTRIES = 300;

/** Redis key for inbound SMS replies ("TextReplys"). */
const TEXT_REPLIES_REDIS_KEY = "textReplys";
const MAX_TEXT_REPLY_ENTRIES = 500;

// Pickup time window configuration for a single day
export interface PickupTimeWindow {
  startTime: string; // e.g. "12:00 PM"
  endTime: string;   // e.g. "6:00 PM"
  blocked?: boolean; // if true, no pickup available this weekday at all
}

// Per-weekday pickup time configuration keyed by 0-6 (Sun-Sat) as strings
export type PickupTimesConfig = Record<string, PickupTimeWindow>;

// Lazy load Upstash Redis to avoid build-time errors
async function getRedis() {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      console.warn("Upstash Redis credentials not found. Check environment variables:");
      console.warn("UPSTASH_REDIS_REST_URL:", url ? "✓ Set" : "✗ Missing");
      console.warn("UPSTASH_REDIS_REST_TOKEN:", token ? "✓ Set" : "✗ Missing");
      return null;
    }

    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: url,
      token: token,
    });
    
    // Test connection
    try {
      await redis.ping();
      console.log("✓ Upstash Redis connection successful");
    } catch (pingError) {
      console.error("✗ Upstash Redis ping failed:", pingError);
      return null;
    }
    
    return redis;
  } catch (error) {
    console.error("Upstash Redis initialization error:", error);
    return null;
  }
}

// Read orders from Upstash Redis
export async function getOrders(): Promise<Order[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, returning empty array");
      return [];
    }
    const orders = await redis.get<Order[]>('orders');
    console.log(`✓ Retrieved ${orders?.length || 0} orders from Redis`);
    return orders || [];
  } catch (error) {
    console.error("Error reading orders from Redis:", error);
    // Fallback to empty array if Redis is not configured
    return [];
  }
}

// Save order to Upstash Redis
export async function saveOrder(order: Order): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Order not persisted.");
      throw new Error("Redis not configured");
    }
    
    const orders = await getOrders();
    orders.push(order);
    
    console.log(`Saving ${orders.length} orders to Redis (including new order: ${order.id})`);
    await redis.set('orders', orders);
    
    // Verify it was saved
    const verify = await redis.get<Order[]>('orders');
    if (verify && verify.length === orders.length) {
      console.log(`✓ Order ${order.id} saved successfully. Total orders: ${verify.length}`);
    } else {
      console.error("✗ Order save verification failed. Expected:", orders.length, "Got:", verify?.length || 0);
    }
  } catch (error) {
    console.error("Error saving order to Redis:", error);
    // Re-throw so the API can handle it
    throw error;
  }
}

// Get order by ID
export async function getOrderById(id: string): Promise<Order | null> {
  try {
    const orders = await getOrders();
    return orders.find((order) => order.id === id) || null;
  } catch (error) {
    console.error("Error getting order by ID:", error);
    return null;
  }
}

type OrderUpdatePayload = Partial<Order> & {
  itemReviews?: Record<number, string>;
  itemRatings?: Record<number, number>;
};

// Update order (e.g., mark as completed)
export async function updateOrder(orderId: string, updates: OrderUpdatePayload): Promise<Order | null> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Cannot update order.");
      throw new Error("Redis not configured");
    }
    
    const orders = await getOrders();
    const orderIndex = orders.findIndex((order) => order.id === orderId);
    
    if (orderIndex === -1) {
      console.error(`Order ${orderId} not found`);
      return null;
    }
    
    // Apply item-level review/rating updates if provided
    let updatedItems = orders[orderIndex].items;
    if ((updates.itemReviews || updates.itemRatings) && orders[orderIndex].items) {
      updatedItems = orders[orderIndex].items.map((item, idx) => {
        const next: any = { ...item };

        if (updates.itemReviews && Object.prototype.hasOwnProperty.call(updates.itemReviews, idx)) {
          next.review = updates.itemReviews[idx];
        }

        if (updates.itemRatings && Object.prototype.hasOwnProperty.call(updates.itemRatings, idx)) {
          next.rating = updates.itemRatings[idx];
        }

        return next;
      });
    }

    // Update the order
    const { itemReviews, itemRatings, ...restUpdates } = updates;
    orders[orderIndex] = {
      ...orders[orderIndex],
      ...restUpdates,
      items: updatedItems,
    };
    
    // Save updated orders
    console.log(`Updating order ${orderId} in Redis`);
    await redis.set('orders', orders);
    
    // Verify it was saved
    const verify = await redis.get<Order[]>('orders');
    if (verify) {
      const updatedOrder = verify.find((o) => o.id === orderId);
      if (updatedOrder) {
        console.log(`✓ Order ${orderId} updated successfully`);
        return updatedOrder;
      }
    }
    
    console.error("✗ Order update verification failed");
    return null;
  } catch (error) {
    console.error("Error updating order:", error);
    throw error;
  }
}

// Delete order
export async function deleteOrder(orderId: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Cannot delete order.");
      throw new Error("Redis not configured");
    }

    const orders = await getOrders();
    const filtered = orders.filter((order) => order.id !== orderId);

    if (filtered.length === orders.length) {
      console.warn(`Order ${orderId} not found for deletion`);
      return false;
    }

    console.log(`Deleting order ${orderId}. New total: ${filtered.length}`);
    await redis.set('orders', filtered);
    return true;
  } catch (error) {
    console.error("Error deleting order:", error);
    throw error;
  }
}

// Updates helpers
export async function getUpdates(): Promise<UpdateEntry[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, returning empty updates array");
      return [];
    }
    const updates = await redis.get<UpdateEntry[]>('updates');
    console.log(`✓ Retrieved ${updates?.length || 0} updates from Redis`);
    return updates || [];
  } catch (error) {
    console.error("Error reading updates from Redis:", error);
    return [];
  }
}

function generateUpdateId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

export async function addUpdate(entry: Omit<UpdateEntry, "id">): Promise<UpdateEntry> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Cannot add update.");
      throw new Error("Redis not configured");
    }

    const updates = await getUpdates();
    const newEntry: UpdateEntry = {
      ...entry,
      id: generateUpdateId(),
    };

    updates.push(newEntry);
    updates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log(`Saving ${updates.length} updates to Redis (including new update: ${newEntry.id})`);
    await redis.set('updates', updates);
    return newEntry;
  } catch (error) {
    console.error("Error adding update:", error);
    throw error;
  }
}

export async function deleteUpdate(updateId: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Cannot delete update.");
      throw new Error("Redis not configured");
    }

    const updates = await getUpdates();
    const next = updates.filter((u) => u.id !== updateId);

    if (next.length === updates.length) {
      console.warn(`Update ${updateId} not found for deletion`);
      return false;
    }

    await redis.set('updates', next);
    return true;
  } catch (error) {
    console.error("Error deleting update:", error);
    throw error;
  }
}

// Read products from Upstash Redis
export async function getProducts(): Promise<Product[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, returning empty array");
      return [];
    }
    const products = await redis.get<Product[]>('products');
    console.log(`✓ Retrieved ${products?.length || 0} products from Redis`);
    return products || [];
  } catch (error) {
    console.error("Error reading products from Redis:", error);
    // Fallback to empty array if Redis is not configured
    return [];
  }
}

// Save all products to Upstash Redis
export async function saveProducts(products: Product[]): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Products not persisted.");
      throw new Error("Redis not configured");
    }
    
    console.log(`Saving ${products.length} products to Redis`);
    await redis.set('products', products);
    
    // Verify it was saved
    const verify = await redis.get<Product[]>('products');
    if (verify && verify.length === products.length) {
      console.log(`✓ Products saved successfully. Total products: ${verify.length}`);
    } else {
      console.error("✗ Products save verification failed. Expected:", products.length, "Got:", verify?.length || 0);
    }
  } catch (error) {
    console.error("Error saving products to Redis:", error);
    throw error;
  }
}

// Save a single product (add or update)
export async function saveProduct(product: Product): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Product not persisted.");
      throw new Error("Redis not configured");
    }
    
    const products = await getProducts();
    const existingIndex = products.findIndex((p) => p.id === product.id);
    
    if (existingIndex >= 0) {
      // Update existing product
      products[existingIndex] = product;
      console.log(`Updating product ${product.id} in Redis`);
    } else {
      // Add new product
      products.push(product);
      console.log(`Adding new product ${product.id} to Redis`);
    }
    
    await redis.set('products', products);
    
    // Verify it was saved
    const verify = await redis.get<Product[]>('products');
    if (verify) {
      console.log(`✓ Product ${product.id} saved successfully. Total products: ${verify.length}`);
    }
  } catch (error) {
    console.error("Error saving product to Redis:", error);
    throw error;
  }
}

// Update product
export async function updateProduct(productId: string, updates: Partial<Product>): Promise<Product | null> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Cannot update product.");
      throw new Error("Redis not configured");
    }
    
    const products = await getProducts();
    const productIndex = products.findIndex((product) => product.id === productId);
    
    if (productIndex === -1) {
      console.error(`Product ${productId} not found`);
      return null;
    }
    
    // Update the product
    products[productIndex] = {
      ...products[productIndex],
      ...updates,
    };
    
    // Save updated products
    console.log(`Updating product ${productId} in Redis`);
    await redis.set('products', products);
    
    // Verify it was saved
    const verify = await redis.get<Product[]>('products');
    if (verify) {
      const updatedProduct = verify.find((p) => p.id === productId);
      if (updatedProduct) {
        console.log(`✓ Product ${productId} updated successfully`);
        return updatedProduct;
      }
    }
    
    console.error("✗ Product update verification failed");
    return null;
  } catch (error) {
    console.error("Error updating product:", error);
    throw error;
  }
}

// Delete product
export async function deleteProduct(productId: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Cannot delete product.");
      throw new Error("Redis not configured");
    }
    
    const products = await getProducts();
    const filteredProducts = products.filter((product) => product.id !== productId);
    
    if (filteredProducts.length === products.length) {
      console.error(`Product ${productId} not found`);
      return false;
    }
    
    console.log(`Deleting product ${productId} from Redis`);
    await redis.set('products', filteredProducts);
    
    console.log(`✓ Product ${productId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
}

// Blocked dates functions
export async function getBlockedDates(): Promise<string[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, returning empty array");
      return [];
    }
    const blockedDates = await redis.get<string[]>('blockedDates');
    return blockedDates || [];
  } catch (error) {
    console.error("Error reading blocked dates from Redis:", error);
    return [];
  }
}

export async function setBlockedDates(dates: string[]): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Blocked dates not persisted.");
      throw new Error("Redis not configured");
    }
    
    console.log(`Saving ${dates.length} blocked dates to Redis`);
    await redis.set('blockedDates', dates);
    console.log(`✓ Blocked dates saved successfully`);
  } catch (error) {
    console.error("Error saving blocked dates to Redis:", error);
    throw error;
  }
}

export async function toggleBlockedDate(date: string): Promise<string[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      throw new Error("Redis not configured");
    }
    
    const blockedDates = await getBlockedDates();
    const dateIndex = blockedDates.indexOf(date);
    
    if (dateIndex >= 0) {
      // Unblock date
      blockedDates.splice(dateIndex, 1);
    } else {
      // Block date
      blockedDates.push(date);
    }
    
    await setBlockedDates(blockedDates);
    return blockedDates;
  } catch (error) {
    console.error("Error toggling blocked date:", error);
    throw error;
  }
}

// Pickup time configuration functions
export async function getPickupTimes(): Promise<PickupTimesConfig> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, returning default pickup times");
      // Default: every day 12:00 PM–6:00 PM
      return {
        "0": { startTime: "12:00 PM", endTime: "6:00 PM" }, // Sunday
        "1": { startTime: "12:00 PM", endTime: "6:00 PM" }, // Monday
        "2": { startTime: "12:00 PM", endTime: "6:00 PM" }, // Tuesday
        "3": { startTime: "12:00 PM", endTime: "6:00 PM" }, // Wednesday
        "4": { startTime: "12:00 PM", endTime: "6:00 PM" }, // Thursday
        "5": { startTime: "12:00 PM", endTime: "6:00 PM" }, // Friday
        "6": { startTime: "12:00 PM", endTime: "6:00 PM" }, // Saturday
      };
    }

    const stored = await redis.get<PickupTimesConfig>("pickupTimes");
    if (stored && Object.keys(stored).length > 0) {
      return stored;
    }

    // Initialize with defaults if nothing stored yet
    const defaults: PickupTimesConfig = {
      "0": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "1": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "2": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "3": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "4": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "5": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "6": { startTime: "12:00 PM", endTime: "6:00 PM" },
    };

    await redis.set("pickupTimes", defaults);
    console.log("✓ Initialized default pickupTimes in Redis");
    return defaults;
  } catch (error) {
    console.error("Error reading pickup times from Redis:", error);
    // Fallback to defaults if anything fails
    return {
      "0": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "1": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "2": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "3": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "4": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "5": { startTime: "12:00 PM", endTime: "6:00 PM" },
      "6": { startTime: "12:00 PM", endTime: "6:00 PM" },
    };
  }
}

export async function setPickupTimes(config: PickupTimesConfig): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Pickup times not persisted.");
      throw new Error("Redis not configured");
    }

    console.log("Saving pickupTimes configuration to Redis");
    await redis.set("pickupTimes", config);
    console.log("✓ Pickup times saved successfully");
  } catch (error) {
    console.error("Error saving pickup times to Redis:", error);
    throw error;
  }
}

// Pickup window overrides for specific dates (YYYY-MM-DD -> window)
// Overrides the weekday default for that date. blocked=true means no pickup that day.
export type PickupWindowDates = Record<string, PickupTimeWindow>;

export async function getPickupWindowDates(): Promise<PickupWindowDates> {
  try {
    const redis = await getRedis();
    if (!redis) return {};
    const stored = await redis.get<PickupWindowDates>("pickupWindowDates");
    return stored || {};
  } catch (error) {
    console.error("Error reading pickup window dates:", error);
    return {};
  }
}

export async function setPickupWindowForDate(
  date: string,
  window: PickupTimeWindow
): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) throw new Error("Redis not configured");
    const all = await getPickupWindowDates();
    all[date] = window;
    await redis.set("pickupWindowDates", all);
  } catch (error) {
    console.error("Error saving pickup window for date:", error);
    throw error;
  }
}

export async function removePickupWindowForDate(date: string): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) throw new Error("Redis not configured");
    const all = await getPickupWindowDates();
    delete all[date];
    await redis.set("pickupWindowDates", all);
  } catch (error) {
    console.error("Error removing pickup window for date:", error);
    throw error;
  }
}

// Parse "12:00 PM" style string to minutes since midnight
function parseTimeToMinutes(time: string): number | null {
  const match = (time || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

/** Validate pickup date and time against current config. Returns error message if invalid. */
export async function validatePickupSlot(
  pickupDate: string,
  pickupTime: string
): Promise<{ valid: true } | { valid: false; error: string }> {
  const [blockedDates, pickupTimesConfig, pickupWindowDates] = await Promise.all([
    getBlockedDates(),
    getPickupTimes(),
    getPickupWindowDates(),
  ]);

  if (blockedDates.includes(pickupDate)) {
    return { valid: false, error: "This pickup date is no longer available. Please choose another date." };
  }

  const dateOverride = pickupWindowDates[pickupDate];
  if (dateOverride?.blocked) {
    return { valid: false, error: "This pickup date is no longer available. Please choose another date." };
  }

  const [y, m, d] = pickupDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dayKey = String(date.getDay());
  const weekdayWindow = pickupTimesConfig[dayKey];
  const window = dateOverride ?? weekdayWindow;

  if (!window || window.blocked) {
    return { valid: false, error: "Pickup is not available on this date. Please choose another date." };
  }

  const startMins = parseTimeToMinutes(window.startTime);
  const endMins = parseTimeToMinutes(window.endTime);
  const slotMins = parseTimeToMinutes(pickupTime);

  if (startMins == null || endMins == null || slotMins == null) {
    return { valid: false, error: "Invalid pickup time. Please refresh and select a valid time slot." };
  }

  if (slotMins < startMins || slotMins > endMins) {
    return { valid: false, error: "This pickup time is no longer available. The window for this date is " + window.startTime + "–" + window.endTime + ". Please choose another time." };
  }

  return { valid: true };
}

// Gallery images functions
export interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  description?: string;
  date?: string;
}

export async function getGalleryImages(): Promise<GalleryImage[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, returning empty array");
      return [];
    }
    const images = await redis.get<GalleryImage[]>('galleryImages');
    return images || [];
  } catch (error) {
    console.error("Error reading gallery images from Redis:", error);
    return [];
  }
}

export async function saveGalleryImage(image: GalleryImage): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Gallery image not persisted.");
      throw new Error("Redis not configured");
    }
    
    const images = await getGalleryImages();
    images.push(image);
    
    console.log(`Saving gallery image ${image.id} to Redis`);
    await redis.set('galleryImages', images);
    console.log(`✓ Gallery image saved successfully. Total images: ${images.length}`);
  } catch (error) {
    console.error("Error saving gallery image to Redis:", error);
    throw error;
  }
}

// Product display order config (admin-controlled)
export interface ProductDisplayConfig {
  categoryOrder?: string[];
  productOrderByCategory?: Record<string, string[]>; // category name -> product IDs in order
}

export async function getProductDisplayConfig(): Promise<ProductDisplayConfig> {
  try {
    const redis = await getRedis();
    if (!redis) return {};
    const stored = await redis.get<ProductDisplayConfig>("productDisplayConfig");
    return stored || {};
  } catch (error) {
    console.error("Error reading product display config:", error);
    return {};
  }
}

export async function setProductDisplayConfig(config: ProductDisplayConfig): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) throw new Error("Redis not configured");
    await redis.set("productDisplayConfig", config);
  } catch (error) {
    console.error("Error saving product display config:", error);
    throw error;
  }
}

/** Read all rows from the Texts log (newest first). */
export async function getTexts(): Promise<TextLogEntry[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, returning empty texts log");
      return [];
    }
    const data = await redis.get<TextLogEntry[]>(TEXTS_REDIS_KEY);
    return data || [];
  } catch (error) {
    console.error("Error reading texts from Redis:", error);
    return [];
  }
}

/** Read inbound SMS reply rows (newest first). */
export async function getTextReplies(): Promise<TextReplyEntry[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, returning empty text replies log");
      return [];
    }
    const data = await redis.get<TextReplyEntry[]>(TEXT_REPLIES_REDIS_KEY);
    return data || [];
  } catch (error) {
    console.error("Error reading text replies from Redis:", error);
    return [];
  }
}

/** Append one inbound SMS reply row (prepends so newest appear first). */
export async function appendTextReplyEntry(entry: TextReplyEntry): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, text reply not persisted");
      return;
    }
    const existing = (await redis.get<TextReplyEntry[]>(TEXT_REPLIES_REDIS_KEY)) || [];
    const next = [entry, ...existing].slice(0, MAX_TEXT_REPLY_ENTRIES);
    await redis.set(TEXT_REPLIES_REDIS_KEY, next);
    console.log(`✓ Text reply entry ${entry.id} saved (${next.length} rows)`);
  } catch (error) {
    console.error("Error appending text reply to Redis:", error);
    throw error;
  }
}

/** Append one row to the Texts log (prepends so newest appear first). */
export async function appendTextsEntry(entry: TextLogEntry): Promise<void> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, texts entry not persisted");
      return;
    }
    const existing = (await redis.get<TextLogEntry[]>(TEXTS_REDIS_KEY)) || [];
    const next = [entry, ...existing].slice(0, MAX_TEXTS_ENTRIES);
    await redis.set(TEXTS_REDIS_KEY, next);
    console.log(`✓ Texts log entry ${entry.id} saved (${next.length} rows)`);
  } catch (error) {
    console.error("Error appending texts entry to Redis:", error);
    throw error;
  }
}

function generateSettingId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/** Read all rows from the Settings collection. */
export async function getSettings(): Promise<SettingEntry[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.warn("Redis not available, returning empty settings");
      return [];
    }
    const data = await redis.get<SettingEntry[]>(SETTINGS_REDIS_KEY);
    return data || [];
  } catch (error) {
    console.error("Error reading settings from Redis:", error);
    return [];
  }
}

/** Read one setting by label. */
export async function getSettingByLabel(label: string): Promise<SettingEntry | null> {
  const settings = await getSettings();
  return settings.find((s) => s.label === label) || null;
}

/** Create or update a setting by label. */
export async function upsertSetting(label: string, value: string): Promise<SettingEntry> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Setting not persisted.");
      throw new Error("Redis not configured");
    }

    const settings = await getSettings();
    const now = new Date().toISOString();
    const existingIndex = settings.findIndex((s) => s.label === label);

    if (existingIndex >= 0) {
      const updated: SettingEntry = {
        ...settings[existingIndex],
        value,
        updatedAt: now,
      };
      settings[existingIndex] = updated;
      await redis.set(SETTINGS_REDIS_KEY, settings);
      console.log(`✓ Setting "${label}" updated`);
      return updated;
    }

    const created: SettingEntry = {
      id: generateSettingId(),
      label,
      value,
      updatedAt: now,
    };
    settings.push(created);
    await redis.set(SETTINGS_REDIS_KEY, settings);
    console.log(`✓ Setting "${label}" created`);
    return created;
  } catch (error) {
    console.error("Error upserting setting:", error);
    throw error;
  }
}

export async function deleteGalleryImage(imageId: string): Promise<boolean> {
  try {
    const redis = await getRedis();
    if (!redis) {
      console.error("✗ Upstash Redis not configured. Cannot delete gallery image.");
      throw new Error("Redis not configured");
    }
    
    const images = await getGalleryImages();
    const filteredImages = images.filter((img) => img.id !== imageId);
    
    if (filteredImages.length === images.length) {
      console.error(`Gallery image ${imageId} not found`);
      return false;
    }
    
    console.log(`Deleting gallery image ${imageId} from Redis`);
    await redis.set('galleryImages', filteredImages);
    console.log(`✓ Gallery image ${imageId} deleted successfully`);
    return true;
  } catch (error) {
    console.error("Error deleting gallery image:", error);
    throw error;
  }
}



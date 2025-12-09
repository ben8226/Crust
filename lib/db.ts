import { Product, Order } from "@/types/product";

// Lazy load Upstash Redis to avoid build-time errors
async function getRedis() {
  try {
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redis;
  } catch (error) {
    console.warn("Upstash Redis not available:", error);
    return null;
  }
}

// Read orders from Upstash Redis
export async function getOrders(): Promise<Order[]> {
  try {
    const redis = await getRedis();
    if (!redis) {
      return [];
    }
    const orders = await redis.get<Order[]>('orders');
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
      console.warn("Upstash Redis not configured. Order not persisted.");
      return;
    }
    const orders = await getOrders();
    orders.push(order);
    await redis.set('orders', orders);
  } catch (error) {
    console.error("Error saving order to Redis:", error);
    // If Redis is not configured, log warning but don't throw
    // This allows the app to work without Redis (orders just won't persist)
    console.warn("Upstash Redis not configured. Order not persisted.");
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

// Read products (always use static data - no KV needed)
export function getProducts(): Product[] {
  // Always return empty array - products come from static data file
  // This keeps it simple and avoids KV for products
  return [];
}



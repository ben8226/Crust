import { Product, Order } from "@/types/product";

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

// Read products (always use static data - no KV needed)
export function getProducts(): Product[] {
  // Always return empty array - products come from static data file
  // This keeps it simple and avoids KV for products
  return [];
}



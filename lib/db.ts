import { Product, Order } from "@/types/product";

// Lazy load Vercel KV to avoid build-time errors
async function getKV() {
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch (error) {
    console.warn("Vercel KV not available:", error);
    return null;
  }
}

// Read orders from Vercel KV
export async function getOrders(): Promise<Order[]> {
  try {
    const kv = await getKV();
    if (!kv) {
      return [];
    }
    const orders = await kv.get<Order[]>('orders');
    return orders || [];
  } catch (error) {
    console.error("Error reading orders from KV:", error);
    // Fallback to empty array if KV is not configured
    return [];
  }
}

// Save order to Vercel KV
export async function saveOrder(order: Order): Promise<void> {
  try {
    const kv = await getKV();
    if (!kv) {
      console.warn("Vercel KV not configured. Order not persisted.");
      return;
    }
    const orders = await getOrders();
    orders.push(order);
    await kv.set('orders', orders);
  } catch (error) {
    console.error("Error saving order to KV:", error);
    // If KV is not configured, log warning but don't throw
    // This allows the app to work without KV (orders just won't persist)
    console.warn("Vercel KV not configured. Order not persisted.");
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



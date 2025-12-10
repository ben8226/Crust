import { Product, Order } from "@/types/product";
import { UpdateEntry } from "@/types/update";

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

// Update order (e.g., mark as completed)
export async function updateOrder(orderId: string, updates: Partial<Order>): Promise<Order | null> {
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
    
    // Update the order
    orders[orderIndex] = {
      ...orders[orderIndex],
      ...updates,
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



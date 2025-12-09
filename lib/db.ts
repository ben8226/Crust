import fs from "fs";
import path from "path";
import { Product, Order } from "@/types/product";

const dataDirectory = path.join(process.cwd(), "data");
const ordersFile = path.join(dataDirectory, "orders.json");
const productsFile = path.join(dataDirectory, "products.json");

// Ensure data directory exists
if (!fs.existsSync(dataDirectory)) {
  fs.mkdirSync(dataDirectory, { recursive: true });
}

// Initialize orders file if it doesn't exist
if (!fs.existsSync(ordersFile)) {
  fs.writeFileSync(ordersFile, JSON.stringify([], null, 2));
}

// Read orders from file
export function getOrders(): Order[] {
  try {
    const fileContents = fs.readFileSync(ordersFile, "utf8");
    return JSON.parse(fileContents);
  } catch (error) {
    console.error("Error reading orders:", error);
    return [];
  }
}

// Save order to file
export function saveOrder(order: Order): void {
  try {
    const orders = getOrders();
    orders.push(order);
    fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
  } catch (error) {
    console.error("Error saving order:", error);
    throw new Error("Failed to save order");
  }
}

// Get order by ID
export function getOrderById(id: string): Order | null {
  const orders = getOrders();
  return orders.find((order) => order.id === id) || null;
}

// Read products from file (fallback to static data)
export function getProducts(): Product[] {
  try {
    if (fs.existsSync(productsFile)) {
      const fileContents = fs.readFileSync(productsFile, "utf8");
      return JSON.parse(fileContents);
    }
    // If products file doesn't exist, return empty array
    // Products will be loaded from the static data file
    return [];
  } catch (error) {
    console.error("Error reading products:", error);
    return [];
  }
}

// Save products to file
export function saveProducts(products: Product[]): void {
  try {
    fs.writeFileSync(productsFile, JSON.stringify(products, null, 2));
  } catch (error) {
    console.error("Error saving products:", error);
    throw new Error("Failed to save products");
  }
}



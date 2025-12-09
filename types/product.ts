export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  customerName: string;
  phone: string;
  total: number;
  date: string;
  paymentMethod?: "cash" | "venmo";
  pickupDate?: string;
  pickupTime?: string;
  // Optional fields for backward compatibility with old orders
  email?: string;
  address?: string;
  city?: string;
  zipCode?: string;
}


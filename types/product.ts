export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  ingredients?: string; // Optional ingredients list
  isMiniLoafBox?: boolean; // Special product that requires bread selection
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedBreads?: string[]; // For mini loaf box: array of 4 bread product IDs
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
  completed?: boolean; // Whether the order has been completed/fulfilled
  completedDate?: string; // Date when order was marked as completed
  // Optional fields for backward compatibility with old orders
  email?: string;
  address?: string;
  city?: string;
  zipCode?: string;
}


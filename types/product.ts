export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  inStock: boolean;
  ingredients?: string; // Optional ingredients list
  loafType?: "mini" | "half"; // Special product types that require bread selection
  allergens?: {
    wheat?: boolean;
    dairy?: boolean;
    egg?: boolean;
  };
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedBreads?: string[]; // For mini loaf box: array of 4 bread product IDs
  cut?: boolean; // Whether bread is sliced (adds $1)
  review?: string; // Optional review for this item when part of an order
  rating?: number; // Optional 1-5 star rating for this item
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
  cancelled?: boolean; // Whether the order has been cancelled
  cancelledDate?: string; // Date when order was cancelled
  review?: string; // Optional customer review
  // Optional fields for backward compatibility with old orders
  email?: string;
  address?: string;
  city?: string;
  zipCode?: string;
}


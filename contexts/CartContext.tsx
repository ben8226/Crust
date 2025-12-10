"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { CartItem, Product } from "@/types/product";

const MAX_CART_ITEMS = 4;

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, selectedBreads?: string[]) => boolean;
  removeFromCart: (productId: string, selectedBreads?: string[]) => void;
  updateQuantity: (productId: string, quantity: number) => boolean;
  toggleCut: (productId: string, selectedBreads?: string[]) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  maxItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product: Product, selectedBreads?: string[]): boolean => {
    // Check if adding would exceed limit
    const currentTotal = cart.reduce((total, item) => total + item.quantity, 0);
    if (currentTotal >= MAX_CART_ITEMS) {
      alert(`Cart limit reached! You can only order up to ${MAX_CART_ITEMS} items at a time.`);
      return false;
    }

    setCart((prevCart) => {
      // For mini loaf box, check if same selection exists
      if (product.isMiniLoafBox && selectedBreads) {
        const existingItem = prevCart.find(
          (item) =>
            item.product.id === product.id &&
            JSON.stringify(item.selectedBreads?.sort()) ===
              JSON.stringify(selectedBreads.sort())
        );
        if (existingItem) {
          return prevCart.map((item) =>
            item.product.id === product.id &&
            JSON.stringify(item.selectedBreads?.sort()) ===
              JSON.stringify(selectedBreads.sort())
              ? { ...item, quantity: item.quantity + 1 }
              : item
          );
        }
        return [
          ...prevCart,
          { product, quantity: 1, selectedBreads, cut: false },
        ];
      }

      // Regular products
      const existingItem = prevCart.find((item) => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prevCart, { product, quantity: 1, cut: false }];
    });
    return true;
  };

  const removeFromCart = (productId: string, selectedBreads?: string[]) => {
    setCart((prevCart) => {
      if (selectedBreads) {
        // For mini loaf box, remove specific selection
        return prevCart.filter(
          (item) =>
            !(
              item.product.id === productId &&
              JSON.stringify(item.selectedBreads?.sort()) ===
                JSON.stringify(selectedBreads.sort())
            )
        );
      }
      // For regular products, remove all instances
      return prevCart.filter((item) => item.product.id !== productId);
    });
  };

  const updateQuantity = (productId: string, quantity: number): boolean => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return true;
    }
    
    // Check if increasing would exceed limit
    const currentItem = cart.find((item) => item.product.id === productId);
    const currentTotal = cart.reduce((total, item) => total + item.quantity, 0);
    const difference = quantity - (currentItem?.quantity || 0);
    
    if (difference > 0 && currentTotal + difference > MAX_CART_ITEMS) {
      alert(`Cart limit reached! You can only order up to ${MAX_CART_ITEMS} items at a time.`);
      return false;
    }
    
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
    return true;
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalPrice = () => {
    return cart.reduce(
      (total, item) =>
        total +
        item.product.price * item.quantity +
        (item.cut ? 1 * item.quantity : 0),
      0
    );
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const toggleCut = (productId: string, selectedBreads?: string[]) => {
    setCart((prevCart) =>
      prevCart.map((item) => {
        const isSameMiniSelection =
          item.product.isMiniLoafBox &&
          selectedBreads &&
          item.selectedBreads &&
          JSON.stringify(item.selectedBreads?.sort()) ===
            JSON.stringify(selectedBreads.sort());

        const isSameProduct =
          item.product.id === productId &&
          (!item.product.isMiniLoafBox || isSameMiniSelection);

        if (!isSameProduct) return item;
        return { ...item, cut: !item.cut };
      })
    );
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        toggleCut,
        clearCart,
        getTotalPrice,
        getTotalItems,
        maxItems: MAX_CART_ITEMS,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}



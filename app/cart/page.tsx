"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { Product } from "@/types/product";

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, toggleCut, getTotalPrice, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "venmo">("cash");
  const [allProducts, setAllProducts] = useState<Product[]>([]);

  // Fetch all products to get bread names for mini loaf boxes
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        if (response.ok) {
          const data = await response.json();
          setAllProducts(data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  const getBreadName = (breadId: string) => {
    const bread = allProducts.find((p) => p.id === breadId);
    return bread?.name || breadId;
  };

  // Load payment method from localStorage on mount
  useEffect(() => {
    const savedPaymentMethod = localStorage.getItem("paymentMethod");
    if (savedPaymentMethod === "cash" || savedPaymentMethod === "venmo") {
      setPaymentMethod(savedPaymentMethod);
    }
  }, []);

  // Save payment method to localStorage when it changes
  useEffect(() => {
    localStorage.setItem("paymentMethod", paymentMethod);
  }, [paymentMethod]);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-tan-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Your Cart</h1>
            <p className="text-gray-600 mb-8">Your cart is empty</p>
            <Link
              href="/"
              className="inline-block bg-brown-600 text-white px-6 py-3 rounded-lg hover:bg-brown-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
          <Footer />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-8">Shopping Cart</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 space-y-4">
            {cart.map((item, index) => (
              <div
                key={`${item.product.id}-${item.selectedBreads ? JSON.stringify(item.selectedBreads) : index}`}
                className="bg-white rounded-lg shadow-md p-4 sm:p-6 flex flex-col sm:flex-row gap-4"
              >
                <div className="relative w-full sm:w-32 h-48 sm:h-32 bg-gray-200 rounded-lg flex-shrink-0">
                  <Image
                    src={item.product.image}
                    alt={item.product.name}
                    fill
                    className="object-cover rounded-lg"
                    sizes="128px"
                  />
                </div>
                <div className="flex-1 w-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 flex-1">
                      {item.product.name}
                    </h3>
                    <button
                      onClick={() => removeFromCart(item.product.id, item.selectedBreads)}
                      className="text-red-600 hover:text-red-700 font-medium text-sm sm:hidden"
                    >
                      ×
                    </button>
                  </div>
                  <p className="text-gray-600 text-sm mb-3 sm:mb-4">{item.product.description}</p>
                  
                  {/* Show selected breads for mini loaf box */}
                  {item.product.isMiniLoafBox && item.selectedBreads && item.selectedBreads.length > 0 && (
                    <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-tan-100 rounded-lg border border-brown-200">
                      <p className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Selected Breads:</p>
                      <ul className="list-disc list-inside space-y-0.5 sm:space-y-1">
                        {item.selectedBreads.map((breadId, index) => (
                          <li key={index} className="text-xs sm:text-sm text-gray-600">
                            {getBreadName(breadId)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
                    <div className="flex items-center space-x-3">
                      <label className="text-xs sm:text-sm text-gray-700">Quantity:</label>
                      <div className="flex items-center border rounded">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 sm:px-3 py-1 hover:bg-gray-100 text-sm sm:text-base"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="px-3 sm:px-4 py-1 border-x text-sm sm:text-base">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 sm:px-3 py-1 hover:bg-gray-100 text-sm sm:text-base"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-base sm:text-lg font-semibold text-gray-900">
                        ${(item.product.price * item.quantity + (item.cut ? item.quantity : 0)).toFixed(2)}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-500">
                        ${item.product.price.toFixed(2)} each
                      </p>
                      {item.cut && (
                        <p className="text-xs text-gray-500">+${(1 * item.quantity).toFixed(2)} slicing</p>
                      )}
                    </div>
                  </div>

                  {/* Slice bread option (only for bread category, non-mini loaf) */}
                  {item.product.category?.toLowerCase().includes("bread") && !item.product.isMiniLoafBox && (
                    <label className="mt-3 inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={item.cut || false}
                        onChange={() => toggleCut(item.product.id)}
                        className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                      />
                      <span>Slice bread (+$1)</span>
                    </label>
                  )}
                </div>
                <button
                  onClick={() => removeFromCart(item.product.id, item.selectedBreads)}
                  className="hidden sm:block text-red-600 hover:text-red-700 font-medium text-sm"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 font-medium"
            >
              Clear Cart
            </button>
          </div>
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-gray-700">
                  <span>Items</span>
                  <span>{cart.reduce((t, i) => t + i.quantity, 0)} / 4</span>
                </div>
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal</span>
                  <span>${getTotalPrice().toFixed(2)}</span>
                </div>
               
                <div className="border-t pt-3 flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>${getTotalPrice().toFixed(2)}</span>
                </div>
              </div>
              
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method</h3>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === "cash"}
                      onChange={(e) => setPaymentMethod(e.target.value as "cash" | "venmo")}
                      className="w-4 h-4 text-brown-600 focus:ring-brown-500"
                    />
                    <span className="ml-3 text-gray-700 font-medium">Cash (at pickup)</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="venmo"
                      checked={paymentMethod === "venmo"}
                      onChange={(e) => setPaymentMethod(e.target.value as "cash" | "venmo")}
                      className="w-4 h-4 text-brown-600 focus:ring-brown-500"
                    />
                    <span className="ml-3 text-gray-700 font-medium">Venmo (pre-pay)</span>
                  </label>
                </div>
              </div>
              
              <Link
                href="/checkout"
                className="block w-full bg-brown-600 text-white text-center py-3 rounded-lg hover:bg-brown-700 transition-colors font-medium"
              >
                Proceed to Checkout
              </Link>
              <Link
                href="/"
                className="block w-full text-center py-3 text-gray-700 hover:text-gray-900 mt-3"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}



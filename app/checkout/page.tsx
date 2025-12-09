"use client";

import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function CheckoutPage() {
  const { cart, getTotalPrice, clearCart } = useCart();
  const router = useRouter();
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "venmo">("cash");
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);

  // Calculate min and max dates (2 days from today to one month in future)
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 2); // 2 days from today
  minDate.setHours(0, 0, 0, 0);
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 1);
  maxDate.setHours(23, 59, 59, 999);

  // Fetch blocked dates
  useEffect(() => {
    const fetchBlockedDates = async () => {
      try {
        const response = await fetch("/api/blocked-dates");
        if (response.ok) {
          const data = await response.json();
          setBlockedDates(data);
        }
      } catch (error) {
        console.error("Error fetching blocked dates:", error);
      }
    };
    fetchBlockedDates();
  }, []);

  // Check if a date is blocked (for DatePicker filterDate)
  const isDateBlocked = (date: Date) => {
    const dateString = date.toISOString().split("T")[0];
    return blockedDates.includes(dateString);
  };

  // Convert Date to string for form submission
  const getDateString = (date: Date | null): string => {
    if (!date) return "";
    return date.toISOString().split("T")[0];
  };

  // Load payment method from localStorage on mount
  useEffect(() => {
    const savedPaymentMethod = localStorage.getItem("paymentMethod");
    if (savedPaymentMethod === "cash" || savedPaymentMethod === "venmo") {
      setPaymentMethod(savedPaymentMethod);
    }
  }, []);

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that selected date is not blocked
    if (pickupDate && isDateBlocked(pickupDate)) {
      alert("The selected pickup date is blocked and unavailable. Please choose another date.");
      return;
    }
    
    if (!pickupDate) {
      alert("Please select a pickup date.");
      return;
    }
    
    setIsSubmitting(true);

    try {
      // Submit order to API
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart,
          ...formData,
          total: getTotalPrice(),
          paymentMethod: paymentMethod,
          pickupDate: getDateString(pickupDate),
          pickupTime: pickupTime,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create order");
      }

      const order = await response.json();

      // Clear cart and redirect
      clearCart();
      router.push(`/order-confirmation?id=${order.id}`);
    } catch (error) {
      console.error("Error submitting order:", error);
      alert(error instanceof Error ? error.message : "Failed to submit order. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-tan-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Checkout</h1>
            <p className="text-gray-600 mb-8">Your cart is empty</p>
            <Link
              href="/"
              className="inline-block bg-brown-600 text-white px-6 py-3 rounded-lg hover:bg-brown-700 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Checkout</h1>
          <div className="text-left sm:text-right">
            <p className="text-xs sm:text-sm text-gray-600">Current Time</p>
            <p className="text-base sm:text-lg font-semibold text-gray-900">
              {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: true,
              })}
            </p>
            <p className="text-xs text-gray-500">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4 sm:space-y-6">
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                Customer Information
              </h2>
              
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="border-t pt-4 sm:pt-6">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-4">
                  Schedule Pickup
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="pickupDate" className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Date *
                    </label>
                    <DatePicker
                      selected={pickupDate}
                      onChange={(date: Date | null) => setPickupDate(date)}
                      minDate={minDate}
                      maxDate={maxDate}
                      filterDate={(date: Date) => !isDateBlocked(date)}
                      dateFormat="MMMM d, yyyy"
                      placeholderText="Select a date"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Select a date at least 2 days in advance (up to one month). Blocked dates are greyed out.
                    </p>
                  </div>
                  
                  <div>
                    <label htmlFor="pickupTime" className="block text-sm font-medium text-gray-700 mb-2">
                      Pickup Time *
                    </label>
                    <select
                      id="pickupTime"
                      name="pickupTime"
                      required
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                    >
                      <option value="">Select a time</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="10:30 AM">10:30 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="11:30 AM">11:30 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="12:30 PM">12:30 PM</option>
                      <option value="1:00 PM">1:00 PM</option>
                      <option value="1:30 PM">1:30 PM</option>
                      <option value="2:00 PM">2:00 PM</option>
                      <option value="2:30 PM">2:30 PM</option>
                      <option value="3:00 PM">3:00 PM</option>
                      <option value="3:30 PM">3:30 PM</option>
                      <option value="4:00 PM">4:00 PM</option>
                      <option value="4:30 PM">4:30 PM</option>
                      <option value="5:00 PM">5:00 PM</option>
                      <option value="5:30 PM">5:30 PM</option>
                      <option value="6:00 PM">6:00 PM</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-brown-600 text-white py-3 rounded-lg font-medium hover:bg-brown-700 transition-colors ${
                  isSubmitting ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "Processing Order..." : "Place Order"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Order Summary</h2>
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="text-gray-900">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-3 flex justify-between text-xl font-bold text-gray-900">
                  <span>Total</span>
                  <span>${getTotalPrice().toFixed(2)}</span>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm text-gray-600">Payment Method</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {paymentMethod === "cash" ? "Cash (at pickup)" : "Venmo (pre-pay)"}
                  </p>
                </div>
                {pickupDate && pickupTime && (
                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-600">Scheduled Pickup</p>
                    <p className="text-base font-semibold text-gray-900">
                      {pickupDate.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-base font-semibold text-gray-900">{pickupTime}</p>
                  </div>
                )}
              </div>
              <Link
                href="/cart"
                className="block w-full text-center py-2 text-gray-700 hover:text-gray-900"
              >
                ← Back to Cart
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { formatDateInput } from "@/lib/date";

export default function CheckoutPage() {
  const { cart, getTotalPrice, clearCart } = useCart();
  const router = useRouter();
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "+1 ",
  });
  const [phoneDigits, setPhoneDigits] = useState(""); // 10-digit US phone (no country code)
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
    const dateString = formatDateInput(date);
    return blockedDates.includes(dateString);
  };

  // Convert Date to string for form submission (local, no UTC shift)
  const getDateString = (date: Date | null): string => {
    if (!date) return "";
    return formatDateInput(date);
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

  // Check if a date is a weekend (Saturday or Sunday)
  const isWeekend = (date: Date | null): boolean => {
    if (!date) return false;
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Sunday, 6 = Saturday
  };

  // Generate pickup time options based on whether it's a weekend
  const getPickupTimeOptions = () => {
    const allTimes = [
      "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
      "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM",
      "2:00 PM", "2:30 PM", "3:00 PM", "3:30 PM",
      "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM", "6:00 PM"
    ];

    // For weekends, start from 12:00 PM
    if (isWeekend(pickupDate)) {
      const noonIndex = allTimes.indexOf("12:00 PM");
      return allTimes.slice(noonIndex);
    }

    // For weekdays, show all times from 10:00 AM
    return allTimes;
  };

  // Clear pickup time if it becomes invalid when date changes
  useEffect(() => {
    if (pickupTime && pickupDate) {
      const availableTimes = getPickupTimeOptions();
      if (!availableTimes.includes(pickupTime)) {
        setPickupTime("");
      }
    }
  }, [pickupDate, pickupTime]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const formatPhone = (digits: string): string => {
    const d = (digits || "").slice(0, 10);
    if (d.length === 0) return "+1 ";
    if (d.length <= 3) return `+1 (${d}`;
    if (d.length <= 6) return `+1 (${d.slice(0, 3)}) ${d.slice(3)}`;
    return `+1 (${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  };

  const keepPhoneCursorAtEnd = () => {
    requestAnimationFrame(() => {
      const el = phoneInputRef.current;
      if (!el) return;
      const end = el.value.length;
      el.setSelectionRange(end, end);
    });
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    let digitsOnly = raw.replace(/\D/g, "");

    // Our input always displays a +1 prefix. That "1" is NOT part of the 10-digit number.
    // So if the user is editing a value that starts with "+1", always drop the leading 1.
    if (raw.trim().startsWith("+1") && digitsOnly.startsWith("1")) {
      digitsOnly = digitsOnly.slice(1);
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith("1")) {
      // If user pastes "1" + 10 digits without the "+1" text, also drop the leading 1.
      digitsOnly = digitsOnly.slice(1);
    }

    const nextDigits = digitsOnly.slice(0, 10);
    setPhoneDigits(nextDigits);
    setFormData((prev) => ({ ...prev, phone: formatPhone(nextDigits) }));
    keepPhoneCursorAtEnd();
  };

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    // Prevent deleting/modifying the "+1 " prefix.
    const prefixLength = 3; // "+1 "
    const isBackspace = e.key === "Backspace";
    const isDelete = e.key === "Delete";

    if ((isBackspace || isDelete) && start <= prefixLength && end <= prefixLength) {
      e.preventDefault();
      keepPhoneCursorAtEnd();
    }
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

    if (phoneDigits.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      keepPhoneCursorAtEnd();
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
      <div className="min-h-screen bg-tan-200">
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
          <Footer />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tan-200">
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
                  ref={phoneInputRef}
                  inputMode="tel"
                  onChange={handlePhoneChange}
                  onKeyDown={handlePhoneKeyDown}
                  onFocus={keepPhoneCursorAtEnd}
                  onClick={keepPhoneCursorAtEnd}
                  placeholder="+1 (123) 234-1111"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Format: +1 (123) 234-1111</p>
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
                      {getPickupTimeOptions().map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
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
                  <div key={item.product.id} className="text-sm text-gray-700">
                    <div className="flex justify-between">
                      <span>
                        {item.product.name} x{item.quantity}
                      </span>
                      <span className="text-gray-900">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    {item.cut && (
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Slicing</span>
                        <span>${(1 * item.quantity).toFixed(2)}</span>
                      </div>
                    )}
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
        <Footer />
      </main>
    </div>
  );
}


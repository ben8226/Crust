"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Product } from "@/types/product";
import {
  formatPickupDisplay,
  parseLocalDateString,
  buildPickupTimeSlots,
} from "@/lib/date";
import { getSpecialEventOrderLimit } from "@/lib/special-event";
import { FULL_NAME_REQUIRED_MESSAGE, isFullName } from "@/lib/validation";
import { DEFAULT_SPECIAL_EVENT_PICKUP_WINDOW } from "@/types/special-event";

interface SpecialEventData {
  date: string;
  productQuantities: Record<string, number>;
  soldByProduct: Record<string, number>;
  remainingByProduct: Record<string, number>;
  isActiveToday: boolean;
  pickupWindow?: { startTime: string; endTime: string };
}

export default function SpecialEventCheckoutPage() {
  const router = useRouter();
  const [eventData, setEventData] = useState<SpecialEventData | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [formData, setFormData] = useState({
    customerName: "",
    phone: "+1 ",
    email: "",
    heardAboutUs: "",
  });
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "venmo">("cash");
  const [pickupTime, setPickupTime] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [nameError, setNameError] = useState("");
  const phoneInputRef = useRef<HTMLInputElement>(null);

  const pickupDate = eventData?.date ? parseLocalDateString(eventData.date) : null;

  useEffect(() => {
    const load = async () => {
      try {
        const [eventRes, productsRes] = await Promise.all([
          fetch("/api/special-event"),
          fetch("/api/products"),
        ]);

        if (productsRes.ok) {
          setProducts(await productsRes.json());
        }
        if (eventRes.ok) {
          const data = await eventRes.json();
          setEventData(data);
        }
      } catch (error) {
        console.error("Error loading special event checkout:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const savedPaymentMethod = localStorage.getItem("paymentMethod");
    if (savedPaymentMethod === "cash" || savedPaymentMethod === "venmo") {
      setPaymentMethod(savedPaymentMethod);
    }
  }, []);

  const eventProducts = useMemo(() => {
    if (!eventData) return [];
    return Object.keys(eventData.productQuantities)
      .map((id) => products.find((p) => p.id === id))
      .filter((p): p is Product => !!p);
  }, [eventData, products]);

  const getRemaining = (productId: string) =>
    eventData?.remainingByProduct[productId] ?? 0;

  const getOrderLimit = (productId: string) =>
    getSpecialEventOrderLimit(getRemaining(productId));

  const setProductQuantity = (productId: string, quantity: number) => {
    const limit = getOrderLimit(productId);
    const next = Math.max(0, Math.min(quantity, limit));
    setQuantities((prev) => {
      if (next === 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return { ...prev, [productId]: next };
    });
  };

  const orderItems = useMemo(() => {
    return Object.entries(quantities)
      .filter(([, qty]) => qty > 0)
      .map(([productId, quantity]) => {
        const product = products.find((p) => p.id === productId)!;
        return { product, quantity, cut: false as const };
      });
  }, [quantities, products]);

  const totalPrice = orderItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const pickupWindow = eventData?.pickupWindow ?? DEFAULT_SPECIAL_EVENT_PICKUP_WINDOW;

  const getAvailableTimes = (): string[] =>
    buildPickupTimeSlots(pickupWindow.startTime, pickupWindow.endTime);

  useEffect(() => {
    if (pickupTime) {
      const availableTimes = getAvailableTimes();
      if (!availableTimes.includes(pickupTime)) {
        setPickupTime("");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventData?.pickupWindow]);

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

  const handlePhoneChange = useCallback((value: string) => {
    let digitsOnly = value.replace(/\D/g, "");
    if (value.trim().startsWith("+1") && digitsOnly.startsWith("1")) {
      digitsOnly = digitsOnly.slice(1);
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith("1")) {
      digitsOnly = digitsOnly.slice(1);
    }
    const nextDigits = digitsOnly.slice(0, 10);
    const formatted = formatPhone(nextDigits);
    setFormData((prev) => ({ ...prev, phone: formatted }));
    const count = nextDigits.length;
    setPhoneError(count > 0 && count !== 10 ? "Please enter a valid 10-digit phone number." : "");
    keepPhoneCursorAtEnd();
  }, []);

  const handlePhoneKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const el = e.currentTarget;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const prefixLength = 3;
    if ((e.key === "Backspace" || e.key === "Delete") && start <= prefixLength && end <= prefixLength) {
      e.preventDefault();
      keepPhoneCursorAtEnd();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (e.target.name === "phone") {
      handlePhoneChange(e.target.value);
    } else {
      if (e.target.name === "customerName") {
        setNameError(
          e.target.value.trim() && !isFullName(e.target.value) ? FULL_NAME_REQUIRED_MESSAGE : ""
        );
      }
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFullName(formData.customerName)) {
      setNameError(FULL_NAME_REQUIRED_MESSAGE);
      return;
    }

    if (!eventData?.isActiveToday || !eventData.date) {
      alert("Today's special event is not available for ordering.");
      return;
    }

    if (orderItems.length === 0) {
      alert("Please select at least one item.");
      return;
    }

    if (!pickupTime) {
      alert("Please select a pickup time.");
      return;
    }

    const availableTimes = getAvailableTimes();
    if (!availableTimes.includes(pickupTime)) {
      alert("The selected pickup time is no longer available. Please choose another time.");
      return;
    }

    let phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.startsWith("1") && phoneDigits.length === 11) phoneDigits = phoneDigits.slice(1);
    else if (phoneDigits.startsWith("1") && phoneDigits.length <= 10) phoneDigits = phoneDigits.slice(1);
    if (phoneDigits.length !== 10) {
      setPhoneError("Please enter a valid 10-digit phone number.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: orderItems,
          customerName: formData.customerName,
          phone: phoneDigits,
          email: formData.email,
          heardAboutUs: formData.heardAboutUs || undefined,
          total: totalPrice,
          paymentMethod,
          pickupDate: eventData.date,
          pickupTime,
          specialEvent: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create order");
      }

      const order = await response.json();
      router.push(`/order-confirmation?id=${order.id}`);
    } catch (error) {
      console.error("Error submitting special event order:", error);
      alert(error instanceof Error ? error.message : "Failed to submit order. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-tan-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center text-gray-600">
          Loading special event…
        </main>
      </div>
    );
  }

  if (!eventData?.isActiveToday) {
    return (
      <div className="min-h-screen bg-tan-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">Special Event</h1>
          <p className="text-gray-600 mb-8">There is no special event available for ordering today.</p>
          <Link
            href="/"
            className="inline-block bg-brown-600 text-white px-6 py-3 rounded-lg hover:bg-brown-700 transition-colors"
          >
            Back to Menu
          </Link>
          <Footer />
        </main>
      </div>
    );
  }

  const availableTimes = getAvailableTimes();

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Special Event Order</h1>
          <p className="text-sm sm:text-base text-amber-800 mt-2 font-medium">
            Same-day pickup · Up to 2 per item · Pre-sliced not available
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
          <div className="lg:col-span-2 space-y-6">
            <section className="bg-white rounded-lg shadow-md p-4 sm:p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Items</h2>
              {eventProducts.length === 0 ? (
                <p className="text-gray-600">No event items are available.</p>
              ) : (
                <div className="space-y-4">
                  {eventProducts.map((product) => {
                    const remaining = getRemaining(product.id);
                    const limit = getOrderLimit(product.id);
                    const qty = quantities[product.id] ?? 0;
                    const soldOut = remaining <= 0;

                    return (
                      <div
                        key={product.id}
                        className={`flex flex-col sm:flex-row gap-4 p-4 border rounded-lg ${
                          soldOut ? "opacity-60 bg-gray-50" : "border-gray-200"
                        }`}
                      >
                        <div className="relative w-full sm:w-28 aspect-[3/2] sm:aspect-square bg-gray-200 rounded-lg flex-shrink-0">
                          <Image
                            src={product.image}
                            alt={product.name}
                            fill
                            className="object-cover rounded-lg"
                            sizes="112px"
                          />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{product.description}</p>
                          <p className="text-sm font-medium text-gray-900 mt-2">
                            ${product.price.toFixed(2)} each
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {soldOut
                              ? "Sold out for today's event"
                              : `${remaining} left · Max ${limit} per order`}
                          </p>
                        </div>
                        {!soldOut && (
                          <div className="flex items-center gap-3 sm:self-center">
                            <button
                              type="button"
                              onClick={() => setProductQuantity(product.id, qty - 1)}
                              disabled={qty <= 0}
                              className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-40"
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <span className="w-8 text-center font-medium">{qty}</span>
                            <button
                              type="button"
                              onClick={() => setProductQuantity(product.id, qty + 1)}
                              disabled={qty >= limit}
                              className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-40"
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4 sm:space-y-6">
              <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>

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
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent ${
                    nameError ? "border-red-500" : "border-gray-300"
                  }`}
                  aria-invalid={!!nameError}
                  aria-describedby={nameError ? "name-error" : undefined}
                />
                {nameError && (
                  <p id="name-error" className="text-red-600 text-sm mt-1" role="alert">
                    {nameError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  id="phone"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  onKeyDown={handlePhoneKeyDown}
                  placeholder="+1 (123) 456-7890"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent ${
                    phoneError ? "border-red-500" : "border-gray-300"
                  }`}
                />
                {phoneError && (
                  <p className="text-red-600 text-sm mt-1" role="alert">
                    {phoneError}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="heardAboutUs" className="block text-sm font-medium text-gray-700 mb-2">
                  How did you hear about us? <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <select
                  id="heardAboutUs"
                  name="heardAboutUs"
                  value={formData.heardAboutUs}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent bg-white"
                >
                  <option value="">Select an option</option>
                  <option value="instagram">Instagram</option>
                  <option value="facebook-marketplace">Facebook: Marketplace</option>
                  <option value="crystal-community-page">Facebook: Crystal Community Page</option>
                  <option value="yard-sign">Yard Sign</option>
                  <option value="friend/family">Friend / Family</option>
                </select>
              </div>

              <div className="border-t pt-4 sm:pt-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Schedule Pickup</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="block text-sm font-medium text-gray-700 mb-2">Pickup Date</p>
                    <p className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-900 font-medium">
                      {formatPickupDisplay(eventData.date, {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Today&apos;s event — no advance notice required.
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
                      disabled={availableTimes.length === 0}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {availableTimes.length === 0 ? "No times available" : "Select a time"}
                      </option>
                      {availableTimes.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Pickup window: {pickupWindow.startTime} – {pickupWindow.endTime}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Payment Method</h3>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cash"
                      checked={paymentMethod === "cash"}
                      onChange={() => setPaymentMethod("cash")}
                      className="w-4 h-4 text-brown-600 focus:ring-brown-500"
                    />
                    <span className="ml-3 text-gray-700 font-medium">Cash (at pickup)</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="venmo"
                      checked={paymentMethod === "venmo"}
                      onChange={() => setPaymentMethod("venmo")}
                      className="w-4 h-4 text-brown-600 focus:ring-brown-500"
                    />
                    <span className="ml-3 text-gray-700 font-medium">Venmo (pre-pay)</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || orderItems.length === 0}
                className={`w-full bg-brown-600 text-white py-3 rounded-lg font-medium hover:bg-brown-700 transition-colors ${
                  isSubmitting || orderItems.length === 0 ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {isSubmitting ? "Processing Order..." : "Place Event Order"}
              </button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 lg:sticky lg:top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
              {orderItems.length === 0 ? (
                <p className="text-sm text-gray-600">No items selected yet.</p>
              ) : (
                <div className="space-y-3 mb-6">
                  {orderItems.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm text-gray-700">
                      <span>
                        {item.product.name} ×{item.quantity}
                      </span>
                      <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-3 flex justify-between text-xl font-bold text-gray-900">
                    <span>Total</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              )}
              <Link href="/" className="block w-full text-center py-2 text-gray-700 hover:text-gray-900">
                ← Back to Menu
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </main>
    </div>
  );
}

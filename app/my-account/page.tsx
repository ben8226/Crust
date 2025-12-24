"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Order, Product } from "@/types/product";
import { formatPickupDisplay } from "@/lib/date";

type Tab = "orders" | "status" | "loyalty";


export default function MyAccountPage() {
  const [phone, setPhone] = useState("");
  const [storedPhone, setStoredPhone] = useState("");
  const [phoneDigits, setPhoneDigits] = useState(""); // 10-digit US phone (no country code)
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("loyalty");
  const [reviewEdits, setReviewEdits] = useState<Record<string, Record<number, string>>>({});
  const [ratingEdits, setRatingEdits] = useState<Record<string, Record<number, number>>>({});
  const [orderReviewEdits, setOrderReviewEdits] = useState<Record<string, string>>({});
  const [openItemReviews, setOpenItemReviews] = useState<Record<string, Record<number, boolean>>>({});
  const [openOrderReviews, setOpenOrderReviews] = useState<Record<string, boolean>>({});
  const [savingReviews, setSavingReviews] = useState<Set<string>>(new Set());

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

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

    // If value starts with +1, that "1" is not part of the 10-digit number.
    if (value.trim().startsWith("+1") && digitsOnly.startsWith("1")) {
      digitsOnly = digitsOnly.slice(1);
    } else if (digitsOnly.length > 10 && digitsOnly.startsWith("1")) {
      // Also handle pasted values like "1" + 10 digits
      digitsOnly = digitsOnly.slice(1);
    }

    const nextDigits = digitsOnly.slice(0, 10);
    setPhoneDigits(nextDigits);
    setPhone(formatPhone(nextDigits));
    keepPhoneCursorAtEnd();
  }, []);

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

  useEffect(() => {
    const saved = localStorage.getItem("customerPhone") || "";
    if (saved) {
      handlePhoneChange(saved);
      setStoredPhone(saved);
      fetchOrders(saved);
    }
  }, [handlePhoneChange]);

  const fetchOrders = async (phoneValue: string) => {
    const trimmed = phoneValue.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setHasFetched(true);
    try {
      const [ordersRes, productsRes] = await Promise.all([
        fetch(`/api/orders?phone=${encodeURIComponent(trimmed)}`),
        fetch("/api/products"),
      ]);

      if (ordersRes.ok) {
        const data: Order[] = await ordersRes.json();
        setOrders(data);

        const itemsReviews: Record<string, Record<number, string>> = {};
        const itemsRatings: Record<string, Record<number, number>> = {};
        const overallReviews: Record<string, string> = {};
        data.forEach((order) => {
          const map: Record<number, string> = {};
          const rmap: Record<number, number> = {};
          order.items.forEach((item, idx) => {
            map[idx] = item.review || "";
            rmap[idx] = typeof item.rating === "number" ? item.rating : 0;
          });
          itemsReviews[order.id] = map;
          itemsRatings[order.id] = rmap;
          overallReviews[order.id] = order.review || "";
        });
        const openOverall: Record<string, boolean> = {};
        data.forEach((order) => {
          openOverall[order.id] = true; // show overall review box by default
        });

        setReviewEdits(itemsReviews);
        setRatingEdits(itemsRatings);
        setOrderReviewEdits(overallReviews);
        setOpenItemReviews({});
        setOpenOrderReviews(openOverall);

        localStorage.setItem("customerPhone", trimmed);
        setStoredPhone(trimmed);
        window.dispatchEvent(new Event("customer-phone-updated"));
      } else {
        setOrders([]);
        setReviewEdits({});
        setRatingEdits({});
        setOrderReviewEdits({});
        setOpenItemReviews({});
        setOpenOrderReviews({});
      }

      if (productsRes.ok) {
        const products: Product[] = await productsRes.json();
        setAllProducts(products);
      } else {
        setAllProducts([]);
      }
    } catch (err) {
      console.error("Error fetching orders by phone:", err);
      setOrders([]);
      setAllProducts([]);
      setReviewEdits({});
      setRatingEdits({});
      setOrderReviewEdits({});
      setOpenItemReviews({});
      setOpenOrderReviews({});
    } finally {
      setIsLoading(false);
    }
  };

  const getBreadName = (breadId: string) => {
    const bread = allProducts.find((p) => p.id === breadId);
    return bread?.name || breadId;
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order? This cannot be undone.")) {
      return;
    }

    setCancellingOrders((prev) => new Set(prev).add(orderId));
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelled: true }),
      });

      if (response.ok) {
        setOrders((prev) =>
          prev.map((order) =>
            order.id === orderId
              ? { ...order, cancelled: true, cancelledDate: new Date().toISOString() }
              : order
          )
        );
      } else {
        alert("Failed to cancel order. Please try again.");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Error cancelling order. Please try again.");
    } finally {
      setCancellingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneDigits.length !== 10) return;
    fetchOrders(phone);
  };

  const displayPickup = (order: Order) => {
    if (order.pickupDate || order.pickupTime) {
      const dateDisplay = formatPickupDisplay(order.pickupDate, {
        month: "short",
        day: "numeric",
      });
      return order.pickupTime ? `${dateDisplay} @ ${order.pickupTime}` : dateDisplay;
    }
    return "Pickup date not set";
  };

  const handleReviewChange = (orderId: string, itemIndex: number, value: string) => {
    setReviewEdits((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemIndex]: value,
      },
    }));
  };

  const handleRatingChange = (orderId: string, itemIndex: number, value: number) => {
    setRatingEdits((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemIndex]: value,
      },
    }));
  };

  const handleOrderReviewChange = (orderId: string, value: string) => {
    setOrderReviewEdits((prev) => ({ ...prev, [orderId]: value }));
  };

  const toggleItemReview = (orderId: string, itemIndex: number) => {
    setOpenItemReviews((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemIndex]: !prev[orderId]?.[itemIndex],
      },
    }));
  };

  const toggleOrderReview = (orderId: string) => {
    setOpenOrderReviews((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleSaveReview = async (orderId: string, itemIndex: number) => {
    const review = reviewEdits[orderId]?.[itemIndex] ?? "";
    const rating = ratingEdits[orderId]?.[itemIndex] ?? 0;
    const savingKey = `${orderId}-${itemIndex}`;
    setSavingReviews((prev) => new Set(prev).add(savingKey));
    try {
      const body: any = { itemReviews: { [itemIndex]: review } };
      if (rating >= 1 && rating <= 5) {
        body.itemRatings = { [itemIndex]: rating };
      }
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setOrders((prev) =>
          prev.map((order) => (order.id === orderId ? { ...order, items: updated.items || order.items } : order))
        );
      }
    } catch (err) {
      console.error("Error saving review:", err);
    } finally {
      setSavingReviews((prev) => {
        const next = new Set(prev);
        next.delete(savingKey);
        return next;
      });
    }
  };

  const handleSaveOrderReview = async (orderId: string) => {
    const review = orderReviewEdits[orderId] ?? "";
    const savingKey = `overall-${orderId}`;
    setSavingReviews((prev) => new Set(prev).add(savingKey));
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review }),
      });
      if (res.ok) {
        setOrders((prev) =>
          prev.map((order) => (order.id === orderId ? { ...order, review } : order))
        );
      }
    } catch (err) {
      console.error("Error saving review:", err);
    } finally {
      setSavingReviews((prev) => {
        const next = new Set(prev);
        next.delete(savingKey);
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {storedPhone ? "My Account" : "Log In"}
          </h1>
          <p className="text-gray-600">Enter your phone number to view your past orders.</p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-xl mx-auto mb-10 space-y-3">
          <input
            type="tel"
            value={phone}
            ref={phoneInputRef}
            inputMode="tel"
            onChange={(e) => handlePhoneChange(e.target.value)}
            onKeyDown={handlePhoneKeyDown}
            onFocus={keepPhoneCursorAtEnd}
            onClick={keepPhoneCursorAtEnd}
            placeholder="+1 (123) 234-1111"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent text-lg"
          />
          <button
            type="submit"
            disabled={isLoading || phoneDigits.length !== 10}
            className="w-full px-6 py-3 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Loading..." : storedPhone ? "Refresh Orders" : "Log In"}
          </button>
        </form>

        <div className="max-w-3xl mx-auto mb-6 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("loyalty")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === "loyalty"
                  ? "border-brown-600 text-brown-700"
                  : "border-transparent text-gray-600 hover:text-brown-700"
              }`}
            >
              Loyalty Rewards
            </button>
            <button
              onClick={() => setActiveTab("status")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === "status"
                  ? "border-brown-600 text-brown-700"
                  : "border-transparent text-gray-600 hover:text-brown-700"
              }`}
            >
              Order Status
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 font-medium border-b-2 transition-colors ${
                activeTab === "orders"
                  ? "border-brown-600 text-brown-700"
                  : "border-transparent text-gray-600 hover:text-brown-700"
              }`}
            >
              Previous Orders
            </button>
          </div>
        </div>

        {activeTab === "status" && hasFetched && (
          <div className="space-y-4">
            {orders.filter((o) => !o.completed && !o.cancelled).length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
                No pending orders found for this phone number.
              </div>
            ) : (
              orders
                .filter((o) => !o.completed && !o.cancelled)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((order) => (
                  <div key={order.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900">Order #{order.id}</h3>
                          <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                            Pending
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Ordered on{" "}
                          {new Date(order.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="text-2xl font-bold text-gray-900">${order.total.toFixed(2)}</p>
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={cancellingOrders.has(order.id)}
                          className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          {cancellingOrders.has(order.id) ? "Cancelling..." : "Cancel Order"}
                        </button>
                      </div>
                    </div>

                    {order.pickupDate && order.pickupTime && (
                      <div className="bg-brown-50 rounded-lg p-4 mb-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">Scheduled Pickup</p>
                        <p className="text-lg font-bold text-brown-700">
                          {formatPickupDisplay(order.pickupDate, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                        <p className="text-base font-semibold text-brown-600">{order.pickupTime}</p>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            <div className="flex justify-between text-gray-700">
                              <span>
                                {item.product.name} × {item.quantity}
                              </span>
                              <span>${(item.product.price * item.quantity).toFixed(2)}</span>
                            </div>
                            {(item.product.loafType === "mini" || item.product.loafType === "half") &&
                              item.selectedBreads &&
                              item.selectedBreads.length > 0 && (
                                <div className="ml-4 mt-1 text-xs text-gray-600">
                                  <p className="font-medium">Selected Breads:</p>
                                  <ul className="list-disc list-inside">
                                    {item.selectedBreads.map((breadId, idx) => (
                                      <li key={idx}>{getBreadName(breadId)}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}

        {activeTab === "orders" && hasFetched && (
          <div className="space-y-4">
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
                No orders found for this phone number.
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
                  <div className="text-sm text-gray-500 mb-2">Pickup: {displayPickup(order)}</div>
                  <div className="space-y-4 text-gray-800">
                    {order.items.map((item, idx) => {
                      const savingKey = `${order.id}-${idx}`;
                      const isOpen = openItemReviews[order.id]?.[idx];
                      return (
                        <div key={idx} className="border-t border-gray-100 pt-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{item.product.name}</p>
                              <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleItemReview(order.id, idx)}
                              className="text-sm text-brown-700 underline underline-offset-2 hover:text-brown-800 transition-colors"
                            >
                              {isOpen ? "Hide Review" : "Add/Edit Review"}
                            </button>
                          </div>
                          {isOpen && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-gray-800">Rating</p>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }, (_, i) => {
                                    const starValue = i + 1;
                                    const current = ratingEdits[order.id]?.[idx] ?? 0;
                                    const active = starValue <= current;
                                    return (
                                      <button
                                        key={starValue}
                                        type="button"
                                        onClick={() => handleRatingChange(order.id, idx, starValue)}
                                        className={`text-xl leading-none transition-colors ${
                                          active ? "text-yellow-500" : "text-gray-300 hover:text-yellow-400"
                                        }`}
                                        aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
                                      >
                                        ★
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <textarea
                                value={reviewEdits[order.id]?.[idx] ?? ""}
                                onChange={(e) => handleReviewChange(order.id, idx, e.target.value)}
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent text-sm"
                                placeholder="Share feedback about this item"
                              />
                              <div className="flex justify-end mt-2">
                                <button
                                  onClick={() => handleSaveReview(order.id, idx)}
                                  disabled={savingReviews.has(savingKey)}
                                  className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                                >
                                  {savingReviews.has(savingKey) ? "Saving..." : "Save Review"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-200 pt-3">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-gray-800">Overall Review</p>
                        <button
                          type="button"
                          onClick={() => toggleOrderReview(order.id)}
                          className="text-sm text-brown-700 underline underline-offset-2 hover:text-brown-800 transition-colors"
                        >
                          {openOrderReviews[order.id] ? "Hide" : "Add/Edit"}
                        </button>
                      </div>
                      {openOrderReviews[order.id] && (
                        <div className="mt-2">
                          <textarea
                            value={orderReviewEdits[order.id] ?? ""}
                            onChange={(e) => handleOrderReviewChange(order.id, e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent text-sm"
                            placeholder="Share overall feedback about this order"
                          />
                          <div className="flex justify-end mt-2">
                            <button
                              onClick={() => handleSaveOrderReview(order.id)}
                              disabled={savingReviews.has(`overall-${order.id}`)}
                              className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              {savingReviews.has(`overall-${order.id}`) ? "Saving..." : "Save Overall Review"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "loyalty" && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 text-center text-gray-600">
              Loyalty rewards are coming soon.
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}


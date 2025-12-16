"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Order } from "@/types/product";
import { formatPickupDisplay } from "@/lib/date";

type Tab = "orders" | "loyalty";


export default function MyAccountPage() {
  const [phone, setPhone] = useState("");
  const [storedPhone, setStoredPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("loyalty");
  const [reviewEdits, setReviewEdits] = useState<Record<string, Record<number, string>>>({});
  const [orderReviewEdits, setOrderReviewEdits] = useState<Record<string, string>>({});
  const [openItemReviews, setOpenItemReviews] = useState<Record<string, Record<number, boolean>>>({});
  const [openOrderReviews, setOpenOrderReviews] = useState<Record<string, boolean>>({});
  const [savingReviews, setSavingReviews] = useState<Set<string>>(new Set());

  const normalizePhone = (value: string) => value.replace(/\D/g, "");

  useEffect(() => {
    const saved = localStorage.getItem("customerPhone") || "";
    if (saved) {
      setPhone(saved);
      setStoredPhone(saved);
      fetchOrders(saved);
    }
  }, []);

  const fetchOrders = async (phoneValue: string) => {
    const trimmed = phoneValue.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setHasFetched(true);
    try {
      const res = await fetch(`/api/orders?phone=${encodeURIComponent(trimmed)}`);
      if (res.ok) {
        const data: Order[] = await res.json();
        setOrders(data);

        const itemsReviews: Record<string, Record<number, string>> = {};
        const overallReviews: Record<string, string> = {};
        data.forEach((order) => {
          const map: Record<number, string> = {};
          order.items.forEach((item, idx) => {
            map[idx] = item.review || "";
          });
          itemsReviews[order.id] = map;
          overallReviews[order.id] = order.review || "";
        });
        const openOverall: Record<string, boolean> = {};
        data.forEach((order) => {
          openOverall[order.id] = true; // show overall review box by default
        });

        setReviewEdits(itemsReviews);
        setOrderReviewEdits(overallReviews);
        setOpenItemReviews({});
        setOpenOrderReviews(openOverall);

        localStorage.setItem("customerPhone", trimmed);
        setStoredPhone(trimmed);
        window.dispatchEvent(new Event("customer-phone-updated"));
      } else {
        setOrders([]);
        setReviewEdits({});
        setOrderReviewEdits({});
        setOpenItemReviews({});
        setOpenOrderReviews({});
      }
    } catch (err) {
      console.error("Error fetching orders by phone:", err);
      setOrders([]);
      setReviewEdits({});
      setOrderReviewEdits({});
      setOpenItemReviews({});
      setOpenOrderReviews({});
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    const savingKey = `${orderId}-${itemIndex}`;
    setSavingReviews((prev) => new Set(prev).add(savingKey));
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemReviews: { [itemIndex]: review } }),
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
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Enter your phone number"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent text-lg"
          />
          <button
            type="submit"
            disabled={isLoading || !normalizePhone(phone)}
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


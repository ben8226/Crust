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
        localStorage.setItem("customerPhone", trimmed);
        setStoredPhone(trimmed);
        window.dispatchEvent(new Event("customer-phone-updated"));
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error("Error fetching orders by phone:", err);
      setOrders([]);
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
                  <ul className="space-y-1 text-gray-800">
                    {order.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>{item.product.name}</span>
                        <span className="text-sm text-gray-600">x{item.quantity}</span>
                      </li>
                    ))}
                  </ul>
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


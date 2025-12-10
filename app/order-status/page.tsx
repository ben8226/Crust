"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Order, Product } from "@/types/product";
import { formatPickupDisplay } from "@/lib/date";

export default function OrderStatusPage() {
  const [searchName, setSearchName] = useState("");
  const [searchPhone, setSearchPhone] = useState("");
  const [searchOrderId, setSearchOrderId] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [cancellingOrders, setCancellingOrders] = useState<Set<string>>(new Set());

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
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
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

  // Normalize phone number for comparison (remove all non-digits)
  const normalizePhone = (phone: string) => {
    return phone.replace(/\D/g, "");
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasOrderId = !!searchOrderId.trim();
    const hasNamePhone = !!searchName.trim() && !!searchPhone.trim();

    if (!hasOrderId && !hasNamePhone) {
      alert("Enter an order number, or your exact name and phone number.");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Fetch all orders
      const [ordersResponse, productsResponse] = await Promise.all([
        fetch("/api/orders"),
        fetch("/api/products"),
      ]);

      if (ordersResponse.ok) {
        const allOrders: Order[] = await ordersResponse.json();

        let matchingOrders: Order[] = [];

        if (hasOrderId) {
          const targetId = searchOrderId.trim().toUpperCase();
          matchingOrders = allOrders.filter(
            (order) => order.id.toUpperCase() === targetId
          );
        } else if (hasNamePhone) {
          const normalizedSearchPhone = normalizePhone(searchPhone);
          matchingOrders = allOrders.filter((order) => {
            const nameMatch =
              order.customerName.toLowerCase().trim() ===
              searchName.toLowerCase().trim();
            const phoneMatch = normalizePhone(order.phone) === normalizedSearchPhone;
            return nameMatch && phoneMatch;
          });
        }

        // Sort by date (newest first)
        matchingOrders.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setOrders(matchingOrders);
      }

      if (productsResponse.ok) {
        const products = await productsResponse.json();
        setAllProducts(products);
      }
    } catch (error) {
      console.error("Error searching orders:", error);
      alert("Error searching for orders. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Order Status</h1>
          <p className="text-gray-600">
            Search by Order Number, or by your exact Name and Phone Number
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mb-8">
          <div className="max-w-xl mx-auto space-y-3">
            <input
              type="text"
              value={searchOrderId}
              onChange={(e) => setSearchOrderId(e.target.value)}
              placeholder="Enter order number (e.g., H7K3M)..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent text-lg"
            />
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="font-medium text-gray-700">OR</span>
              <span>search by your exact name and phone number</span>
            </div>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent text-lg"
            />
            <input
              type="tel"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="Enter your phone number..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent text-lg"
            />
            <button
              type="submit"
              disabled={
                isSearching ||
                (!searchOrderId.trim() && (!searchName.trim() || !searchPhone.trim()))
              }
              className="w-full px-6 py-3 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? "Searching..." : "Search Orders"}
            </button>
          </div>
        </form>

        {/* Results */}
        {hasSearched && (
          <>
            {orders.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-600 text-lg">
                  No orders found
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Make sure you enter the order number, or the exact name and phone number used when placing your order.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 text-center mb-4">
                  Found {orders.length} order{orders.length !== 1 ? "s" : ""} for {searchName}
                </p>
                
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className={`bg-white rounded-lg shadow-md p-4 sm:p-6 ${
                      order.completed || order.cancelled ? "opacity-75" : ""
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                            Order #{order.id}
                          </h3>
                          {order.cancelled ? (
                            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                              Cancelled
                            </span>
                          ) : order.completed ? (
                            <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
                              Completed
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
                              Pending
                            </span>
                          )}
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
                        <p className="text-2xl font-bold text-gray-900">
                          ${order.total.toFixed(2)}
                        </p>
                        {!order.completed && !order.cancelled && (
                          <button
                            onClick={() => handleCancelOrder(order.id)}
                            disabled={cancellingOrders.has(order.id)}
                            className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                          >
                            {cancellingOrders.has(order.id) ? "Cancelling..." : "Cancel Order"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pickup Info */}
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
                        <p className="text-base font-semibold text-brown-600">
                          {order.pickupTime}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-sm">
                      <div>
                        <p className="text-gray-600">Payment Method</p>
                        <p className="font-medium text-gray-900">
                          {order.paymentMethod === "cash"
                            ? "Cash (at pickup)"
                            : "Venmo (pre-pay)"}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Phone</p>
                        <p className="font-medium text-gray-900">{order.phone}</p>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Items</p>
                      <div className="space-y-2">
                        {order.items.map((item, index) => (
                          <div key={index} className="text-sm">
                            <div className="flex justify-between text-gray-700">
                              <span>
                                {item.product.name} × {item.quantity}
                              </span>
                              <span>
                                ${(item.product.price * item.quantity).toFixed(2)}
                              </span>
                            </div>
                            {item.product.isMiniLoafBox &&
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

                    {order.cancelled && order.cancelledDate && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-red-600">
                          ✗ Cancelled on{" "}
                          {new Date(order.cancelledDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    )}

                    {order.completed && order.completedDate && !order.cancelled && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-green-600">
                          ✓ Completed on{" "}
                          {new Date(order.completedDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <Footer />
      </main>
    </div>
  );
}


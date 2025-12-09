"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Link from "next/link";
import { Order } from "@/types/product";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/orders/${orderId}`);
        if (response.ok) {
          const orderData = await response.json();
          setOrder(orderData);
        } else {
          setOrder(null);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        setOrder(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tan-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-tan-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-8">The order you're looking for doesn't exist.</p>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600">Thank you for your order</p>
          </div>

          <div className="bg-tan-50 rounded-lg p-6 mb-6 text-left">
            <div className="mb-4">
              <p className="text-sm text-gray-600">Order Number</p>
              <p className="text-lg font-semibold text-gray-900">{order.id}</p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Order Date</p>
              <p className="text-lg font-semibold text-gray-900">
                {new Date(order.date).toLocaleDateString()}
              </p>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Contact Information</p>
              <p className="text-lg font-semibold text-gray-900">{order.customerName}</p>
              <p className="text-gray-700">Phone: {order.phone}</p>
            </div>
            {order.paymentMethod && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="text-lg font-semibold text-gray-900 capitalize">
                  {order.paymentMethod === "cash" ? "Cash (at pickup)" : "Venmo (pre-pay)"}
                </p>
              </div>
            )}
            {order.pickupDate && order.pickupTime && (
              <div className="mb-4">
                <p className="text-sm text-gray-600">Scheduled Pickup</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(order.pickupDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-lg font-semibold text-gray-900">{order.pickupTime}</p>
              </div>
            )}
            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full bg-brown-600 text-white py-3 rounded-lg hover:bg-brown-700 transition-colors font-medium"
            >
              Continue Shopping
            </Link>
            <p className="text-sm text-gray-600">
              Thank you for your order!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-tan-50">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}


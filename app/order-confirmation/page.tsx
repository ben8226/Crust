"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Order, Product } from "@/types/product";
import { formatPickupDisplay } from "@/lib/date";

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      <div className="min-h-screen bg-tan-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-gray-600">Loading order details...</p>
          </div>
          <Footer />
        </main>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-tan-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-8">The order you&apos;re looking for doesn&apos;t exist.</p>
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-16">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-4 sm:p-6 md:p-8 text-center">
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

          <div className="bg-tan-200 rounded-lg p-6 mb-6 text-left">
            {/* Pickup Date/Time - Prominently at top, centered */}
            {order.pickupDate && order.pickupTime && (
              <div className="text-center mb-6 pb-6 border-b border-brown-300">
                <p className="text-sm text-gray-600 mb-1">Scheduled Pickup</p>
                <p className="text-2xl font-bold text-brown-700">
                  {formatPickupDisplay(order.pickupDate, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <p className="text-xl font-semibold text-brown-600 mb-3">{order.pickupTime}</p>
                {process.env.NEXT_PUBLIC_PICKUP_ADDRESS && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-600 mb-1">Pickup Location</p>
                    <a
                      href={`https://maps.apple.com/?address=${encodeURIComponent(process.env.NEXT_PUBLIC_PICKUP_ADDRESS)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-base font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {process.env.NEXT_PUBLIC_PICKUP_ADDRESS}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Order details in 2 columns */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Order Number</p>
                <p className="text-lg font-semibold text-gray-900">{order.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Order Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(order.date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Contact</p>
                <p className="text-lg font-semibold text-gray-900">{order.customerName}</p>
                <p className="text-sm text-gray-700">{order.phone}</p>
              </div>
              {order.paymentMethod && (
                <div>
                  <p className="text-sm text-gray-600">Payment</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {order.paymentMethod === "cash" ? "Cash (at pickup)" : "Venmo (pre-pay)"}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t pt-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Items:</p>
              <div className="space-y-2">
                {order.items.map((item, index) => (
                  <div key={index} className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-900">
                        {item.product.name} × {item.quantity}
                      </span>
                      <span className="text-gray-900">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                    {item.cut && (
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Slicing</span>
                        <span>${(1 * item.quantity).toFixed(2)}</span>
                      </div>
                    )}
                    {item.product.isMiniLoafBox && item.selectedBreads && item.selectedBreads.length > 0 && (
                      <div className="ml-4 mt-1 text-xs text-gray-600">
                        <p className="font-medium mb-1">Selected Breads:</p>
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
            <div className="border-t pt-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Total</span>
                <span className="text-xl font-bold text-gray-900">
                  ${order.total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Venmo Payment Section - Only shows for Venmo orders */}
          {order.paymentMethod === "venmo" && (() => {
            // Build Venmo payment note with order details
            const itemsList = order.items.map(item => `${item.product.name} x${item.quantity}`).join(", ");
            const pickupInfo = order.pickupDate && order.pickupTime 
              ? `Pickup: ${formatPickupDisplay(order.pickupDate, { month: "short", day: "numeric" })} @ ${order.pickupTime}`
              : "";
            // Venmo note omits order ID per request; keep items and optional pickup info
            const venmoNote = encodeURIComponent(`${itemsList}${pickupInfo ? ` | ${pickupInfo}` : ""}`);
            
            return (
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-center mb-4">
                  <svg 
                    className="w-10 h-10 text-blue-500 mr-2" 
                    viewBox="0 0 24 24" 
                    fill="currentColor"
                  >
                    <path d="M19.5 3c.828 0 1.5.672 1.5 1.5v15c0 .828-.672 1.5-1.5 1.5h-15c-.828 0-1.5-.672-1.5-1.5v-15c0-.828.672-1.5 1.5-1.5h15zm-2.037 4.5c-.166-.532-.65-.875-1.268-.875-.885 0-1.683.586-2.185 1.516l-2.01 3.73-.5-3.73c-.1-.748-.65-1.39-1.434-1.39-1.017 0-1.684.874-1.684 1.764 0 .166.017.35.067.532l1.2 5.51c.133.616.566 1.19 1.317 1.19.85 0 1.534-.49 1.934-1.206l4.38-7.54c.066-.117.1-.25.1-.367 0-.067-.017-.134-.05-.2l.133.066z"/>
                  </svg>
                  <h3 className="text-xl font-bold text-blue-700">Pay with Venmo</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  Please complete your payment of <span className="font-bold text-blue-700">${order.total.toFixed(2)}</span> via Venmo to confirm your order.
                </p>
                <a
                  href={`https://venmo.com/?txn=pay&recipients=${process.env.NEXT_PUBLIC_VENMO_USERNAME || "CrustandCulture"}&amount=${order.total.toFixed(2)}&note=${venmoNote}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-500 text-white py-4 rounded-lg hover:bg-blue-600 transition-colors font-bold text-lg text-center mb-3"
                >
                  Pay ${order.total.toFixed(2)} on Venmo
                </a>
                <p className="text-sm text-gray-600 text-center">
                  <span className="font-semibold">@{process.env.NEXT_PUBLIC_VENMO_USERNAME || "CrustandCulture"}</span>
                </p>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Include your order number <span className="font-mono font-semibold">{order.id}</span> in the payment note
                </p>
              </div>
            );
          })()}

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
        <Footer />
      </main>
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-tan-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-gray-600">Loading...</p>
          </div>
          <Footer />
        </main>
      </div>
    }>
      <OrderConfirmationContent />
    </Suspense>
  );
}


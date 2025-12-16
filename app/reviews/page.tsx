"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Order, Product } from "@/types/product";

export default function ReviewsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("overall");
  const [productReviews, setProductReviews] = useState<Record<string, Array<{ review: string }>>>({});
  const [loadingOverall, setLoadingOverall] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);

  useEffect(() => {
    const fetchInitial = async () => {
      setLoadingOverall(true);
      try {
        const [ordersRes, productsRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/products"),
        ]);
        if (ordersRes.ok) {
          const data = await ordersRes.json();
          setOrders(data);

          // Derive item-level reviews from existing orders as a fallback/initial load
          const derived: Record<string, Array<{ review: string }>> = {};
          data.forEach((order: Order) => {
            order.items.forEach((item) => {
              const text = (item.review || "").trim();
              if (text.length > 0) {
                if (!derived[item.product.id]) derived[item.product.id] = [];
                derived[item.product.id].push({ review: text });
              }
            });
          });
          setProductReviews((prev) => ({ ...derived, ...prev }));
        }
        if (productsRes.ok) {
          const data = await productsRes.json();
          setProducts(data);
        }
      } catch (err) {
        console.error("Error loading reviews page data:", err);
      } finally {
        setLoadingOverall(false);
      }
    };
    fetchInitial();
  }, []);

  const fetchProductReviews = async (productId: string) => {
    if (productId === "overall") return;
    setLoadingProduct(true);
    try {
      const res = await fetch(`/api/reviews/${productId}`);
      if (res.ok) {
        const data = await res.json();
        setProductReviews((prev) => ({ ...prev, [productId]: data }));
      }
    } catch (err) {
      console.error("Error fetching product reviews:", err);
    } finally {
      setLoadingProduct(false);
    }
  };

  const overallReviews = orders.filter((o) => (o.review || "").trim().length > 0);

  const renderOverall = () => {
    if (loadingOverall) {
      return <p className="text-sm text-gray-600">Loading reviews...</p>;
    }
    if (overallReviews.length === 0) {
      return <p className="text-sm text-gray-600">No overall reviews yet.</p>;
    }
    return overallReviews.map((order) => (
      <div key={order.id} className="border border-gray-200 rounded-lg p-3">
        <p className="text-sm text-gray-800 whitespace-pre-line">{order.review}</p>
      </div>
    ));
  };

  const renderProduct = () => {
    const list = productReviews[selectedProduct] || [];
    if (loadingProduct) {
      return <p className="text-sm text-gray-600">Loading reviews...</p>;
    }
    if (list.length === 0) {
      return <p className="text-sm text-gray-600">No reviews for this product yet.</p>;
    }
    return list.map((entry, idx) => (
      <div key={idx} className="border border-gray-200 rounded-lg p-3">
        <p className="text-sm text-gray-800 whitespace-pre-line">{entry.review}</p>
      </div>
    ));
  };

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Reviews</h1>
          <div className="flex items-center gap-2">
            <label htmlFor="product-filter" className="text-sm text-gray-700">
              Show:
            </label>
            <select
              id="product-filter"
              value={selectedProduct}
              onChange={(e) => {
                const next = e.target.value;
                setSelectedProduct(next);
                if (next !== "overall") {
                  fetchProductReviews(next);
                }
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brown-500 focus:border-transparent"
            >
              <option value="overall">Overall Reviews</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-3">
          {selectedProduct === "overall" ? renderOverall() : renderProduct()}
        </div>
      </main>
      <Footer />
    </div>
  );
}


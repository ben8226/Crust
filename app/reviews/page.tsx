"use client";

import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Order, Product } from "@/types/product";

type ReviewSource = "overall" | "product";

interface DisplayReview {
  key: string;
  /** Used only for sorting (newest first) */
  orderDate: string;
  firstName: string;
  source: ReviewSource;
  /** Product name when source === "product" */
  productName: string | null;
  productCategory: string | null;
  productId: string | null;
  /** Resolved bread names when this review is for a mini/half sample box */
  sampleBoxBreadNames?: string[];
  text: string;
  rating?: number;
}

function firstNameFromCustomerName(name: string): string {
  const t = (name || "").trim();
  if (!t) return "Customer";
  const parts = t.split(/\s+/);
  return parts[0] || "Customer";
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function renderStars(rating?: number) {
  if (typeof rating !== "number") return null;
  const r = clamp(rating, 0, 5);
  if (r <= 0) return null;
  return (
    <div className="flex items-center gap-1 mb-2" aria-label={`${r.toFixed(1)} out of 5 stars`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = clamp(r - i, 0, 1);
        return (
          <span key={i} className="relative inline-block text-gray-300 leading-none text-lg">
            ★
            <span
              className="absolute inset-0 overflow-hidden text-yellow-500 leading-none"
              style={{ width: `${fill * 100}%` }}
              aria-hidden="true"
            >
              ★
            </span>
          </span>
        );
      })}
    </div>
  );
}

function buildAllReviews(orders: Order[], nameByProductId: Map<string, string>): DisplayReview[] {
  const out: DisplayReview[] = [];

  for (const order of orders) {
    const orderDate = order.date;
    const firstName = firstNameFromCustomerName(order.customerName);

    const overall = (order.review || "").trim();
    if (overall.length > 0) {
      out.push({
        key: `${order.id}-overall`,
        orderDate,
        firstName,
        source: "overall",
        productName: null,
        productCategory: null,
        productId: null,
        text: overall,
      });
    }

    (order.items || []).forEach((item, idx) => {
      const text = (item.review || "").trim();
      const rating = typeof item.rating === "number" ? item.rating : undefined;
      if (text.length === 0 && (rating === undefined || rating <= 0)) return;

      const isBox = item.product.loafType === "mini" || item.product.loafType === "half";
      const sampleBoxBreadNames =
        isBox && item.selectedBreads && item.selectedBreads.length > 0
          ? item.selectedBreads.map((id) => nameByProductId.get(id) ?? id)
          : undefined;

      out.push({
        key: `${order.id}-item-${idx}`,
        orderDate,
        firstName,
        source: "product",
        productName: item.product.name,
        productCategory: item.product.category || null,
        productId: item.product.id,
        sampleBoxBreadNames,
        text,
        rating,
      });
    });
  }

  out.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  return out;
}

export default function ReviewsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [ordersRes, productsRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/products"),
        ]);
        if (ordersRes.ok) {
          const data: Order[] = await ordersRes.json();
          if (!cancelled) setOrders(data);
        }
        if (productsRes.ok) {
          const data: Product[] = await productsRes.json();
          if (!cancelled) setProducts(data);
        }
      } catch (err) {
        console.error("Error loading reviews page data:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const nameByProductId = useMemo(() => {
    const m = new Map<string, string>();
    products.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [products]);

  const allReviews = useMemo(() => buildAllReviews(orders, nameByProductId), [orders, nameByProductId]);

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Reviews</h1>
          <p className="mt-2 text-sm text-gray-600">
            All customer reviews, newest first. Each card shows the review type (overall or a product name) and who
            left it.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4">
          {loading && <p className="text-sm text-gray-600">Loading reviews…</p>}
          {!loading && allReviews.length === 0 && (
            <p className="text-sm text-gray-600">No reviews yet.</p>
          )}
          {!loading &&
            allReviews.map((rev) => (
              <article
                key={rev.key}
                className="border border-gray-200 rounded-lg p-4 sm:p-5"
              >
                <p className="text-base font-semibold text-gray-900">
                  {rev.source === "overall"
                    ? "Overall Shop Review"
                    : `${rev.productName || "Product"}${rev.productCategory ? ` - ${rev.productCategory}` : ""}`}
                </p>
                <p className="text-xs text-gray-600 mt-1">{rev.firstName}</p>
                {rev.sampleBoxBreadNames && rev.sampleBoxBreadNames.length > 0 && (
                  <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold text-gray-600 mb-1.5">Sample box breads</p>
                    <ul className="text-sm text-gray-800 list-disc list-inside space-y-0.5">
                      {rev.sampleBoxBreadNames.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3">
                {renderStars(rev.rating)}
                {rev.text.length > 0 && (
                  <p className="text-sm text-gray-800 whitespace-pre-line">{rev.text}</p>
                )}
                {rev.text.length === 0 &&
                  rev.source === "product" &&
                  typeof rev.rating === "number" &&
                  rev.rating > 0 && (
                    <p className="text-sm text-gray-500 italic">(No written review)</p>
                  )}
                </div>
              </article>
            ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}

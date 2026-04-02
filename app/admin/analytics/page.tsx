"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Order, Product } from "@/types/product";

const MONTHS: { value: number; label: string }[] = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

function orderInCalendarMonth(order: Order, year: number, month: number): boolean {
  const d = new Date(order.date);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

/** Count loaves: regular lines use quantity; mini/half boxes count each selected bread slot × quantity. Skips cancelled orders. */
function aggregateBreadByProductId(orders: Order[]): Map<string, number> {
  const counts = new Map<string, number>();

  for (const order of orders) {
    if (order.cancelled) continue;

    for (const item of order.items) {
      const isBox = item.product.loafType === "mini" || item.product.loafType === "half";
      if (isBox && item.selectedBreads && item.selectedBreads.length > 0) {
        for (const breadId of item.selectedBreads) {
          const add = item.quantity;
          counts.set(breadId, (counts.get(breadId) ?? 0) + add);
        }
      } else {
        const id = item.product.id;
        counts.set(id, (counts.get(id) ?? 0) + item.quantity);
      }
    }
  }

  return counts;
}

/** Extend this union when adding new analytics tabs. */
type AnalyticsTab = "bread-sold";

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<AnalyticsTab>("bread-sold");
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordersRes, productsRes] = await Promise.all([
          fetch("/api/orders"),
          fetch("/api/products"),
        ]);
        if (!ordersRes.ok) throw new Error("Failed to load orders");
        if (!productsRes.ok) throw new Error("Failed to load products");
        const ordersData: Order[] = await ordersRes.json();
        const productsData: Product[] = await productsRes.json();
        if (!cancelled) {
          setOrders(ordersData);
          setProducts(productsData);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
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

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const years = new Set<number>([current]);
    orders.forEach((o) => years.add(new Date(o.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [orders]);

  const ordersInMonth = useMemo(
    () => orders.filter((o) => orderInCalendarMonth(o, year, month)),
    [orders, year, month]
  );

  const breadBreakdown = useMemo(() => {
    const counts = aggregateBreadByProductId(ordersInMonth);
    const rows = Array.from(counts.entries()).map(([productId, qty]) => ({
      productId,
      name: nameByProductId.get(productId) ?? productId,
      qty,
    }));
    rows.sort((a, b) => b.qty - a.qty || a.name.localeCompare(b.name));
    const total = rows.reduce((s, r) => s + r.qty, 0);
    return { rows, total };
  }, [ordersInMonth, nameByProductId]);

  const monthLabel = MONTHS.find((m) => m.value === month)?.label ?? String(month);

  return (
    <div className="min-h-screen bg-tan-200 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link
            href="/admin"
            className="text-sm font-medium text-brown-700 hover:text-brown-900 underline underline-offset-2"
          >
            ← Admin dashboard
          </Link>
          <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">Reports and metrics. More tabs can be added here over time.</p>
        </div>

        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <div className="flex gap-1 sm:gap-2 min-w-max">
            <button
              type="button"
              onClick={() => setActiveTab("bread-sold")}
              className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === "bread-sold"
                  ? "border-brown-600 text-brown-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              Bread sold
            </button>
          </div>
        </div>

        {activeTab === "bread-sold" && (
          <>
            <p className="text-sm text-gray-600 mb-4">
              By calendar month (order date). Cancelled orders are excluded. Sample boxes count each selected loaf.
            </p>

            <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4 sm:items-end">
                <div className="flex-1 min-w-0">
                  <label htmlFor="analytics-year" className="block text-sm font-medium text-gray-700 mb-1">
                    Year
                  </label>
                  <select
                    id="analytics-year"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500 bg-white"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-0">
                  <label htmlFor="analytics-month" className="block text-sm font-medium text-gray-700 mb-1">
                    Month
                  </label>
                  <select
                    id="analytics-month"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500 bg-white"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {loading && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-gray-600">Loading…</div>
            )}

            {error && !loading && (
              <div className="bg-white rounded-lg shadow-md p-8 text-center text-red-600">{error}</div>
            )}

            {!loading && !error && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {monthLabel} {year}
                </h2>

                <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border border-gray-100">
                  <p className="text-sm font-medium text-gray-600">Total bread sold</p>
                  <p className="text-3xl font-bold text-brown-700 mt-1">{breadBreakdown.total}</p>
                  <p className="text-xs text-gray-500 mt-2">Loaves / units (see note above for sample boxes).</p>
                </div>

                <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-100">
                  <div className="px-4 sm:px-6 py-3 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">By bread type</h3>
                  </div>
                  {breadBreakdown.rows.length === 0 ? (
                    <p className="px-4 sm:px-6 py-8 text-center text-gray-600">No bread sold this month.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Bread
                            </th>
                            <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Qty
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {breadBreakdown.rows.map((row) => (
                            <tr key={row.productId} className="hover:bg-gray-50">
                              <td className="px-4 sm:px-6 py-3 text-sm font-medium text-gray-900">{row.name}</td>
                              <td className="px-4 sm:px-6 py-3 text-sm text-gray-800 text-right tabular-nums">
                                {row.qty}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}

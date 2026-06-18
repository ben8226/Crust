"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Order, Product } from "@/types/product";
import { UpdateEntry } from "@/types/update";
import { TEXTING_MESSAGE_SETTING_LABEL, TEXTS_REMAINING_SETTING_LABEL } from "@/types/settings";
import Link from "next/link";
import AdminPasswordModal from "@/components/AdminPasswordModal";
import { formatDateInput, formatPickupDisplay, parseLocalDateString } from "@/lib/date";

// 30-min slots from 8:00 AM to 10:00 PM for pickup time dropdowns
const PICKUP_TIME_OPTIONS: string[] = (() => {
  const options: string[] = [];
  for (let h = 8; h <= 22; h++) {
    for (const m of [0, 30]) {
      if (h === 22 && m === 30) break;
      const period = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 || 12;
      options.push(`${h12}:${m.toString().padStart(2, "0")} ${period}`);
    }
  }
  return options;
})();

type Tab = "orders" | "products" | "calendar" | "gallery" | "texts" | "updates" | "customers";

function PickupWindowDateModal({
  date,
  window: initialWindow,
  defaultWindow,
  hasOverride,
  onClose,
  onSave,
  onRemoveOverride,
  saving,
  timeOptions,
}: {
  date: string;
  window: { startTime: string; endTime: string; blocked?: boolean };
  defaultWindow: { startTime: string; endTime: string; blocked?: boolean };
  hasOverride: boolean;
  onClose: () => void;
  onSave: (date: string, w: { startTime: string; endTime: string; blocked?: boolean }) => void;
  onRemoveOverride: (date: string) => void;
  saving: boolean;
  timeOptions: string[];
}) {
  const [startTime, setStartTime] = useState(initialWindow.startTime);
  const [endTime, setEndTime] = useState(initialWindow.endTime);
  const [blocked, setBlocked] = useState(!!initialWindow.blocked);

  const displayDate = parseLocalDateString(date)?.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }) ?? date;

  const handleSave = () => {
    onSave(date, { startTime, endTime, blocked });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Pickup window for {displayDate}</h3>
        <p className="text-sm text-gray-600 mb-4">
          Override the default weekday pickup times for this specific date.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              disabled={blocked}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              disabled={blocked}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-brown-500 disabled:bg-gray-100 disabled:text-gray-500"
            >
              {timeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={blocked}
              onChange={(e) => setBlocked(e.target.checked)}
              className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Block pickup on this date</span>
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          {hasOverride && (
            <button
              onClick={() => onRemoveOverride(date)}
              disabled={saving}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
            >
              Use default ({defaultWindow.startTime}–{defaultWindow.endTime})
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function deriveDisplayConfigFromProducts(products: Product[]) {
  const categoryPriority: Record<string, number> = {
    "Sourdough Bread": 0,
    "Bread": 0,
    "Breads": 0,
  };
  const grouped = products.reduce((acc, p) => {
    const cat = p.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {} as Record<string, Product[]>);
  const categoryOrder = Object.keys(grouped).sort((a, b) => {
    const pa = categoryPriority[a] ?? 999;
    const pb = categoryPriority[b] ?? 999;
    if (pa !== pb) return pa - pb;
    return a.localeCompare(b);
  });
  const productOrderByCategory: Record<string, string[]> = {};
  categoryOrder.forEach((cat) => {
    productOrderByCategory[cat] = [...grouped[cat]]
      .sort((a, b) => a.price - b.price)
      .map((p) => p.id);
  });
  return { categoryOrder, productOrderByCategory };
}

export default function AdminPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed" | "cancelled" | "today" | "tomorrow">("pending");
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  const [deletingOrders, setDeletingOrders] = useState<Set<string>>(new Set());

  // Updates state
  const [updates, setUpdates] = useState<UpdateEntry[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(true);
  const [newUpdate, setNewUpdate] = useState({ version: "", description: "", date: "" });
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [deletingUpdates, setDeletingUpdates] = useState<Set<string>>(new Set());
  
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(new Set());
  const [deletingProducts, setDeletingProducts] = useState<Set<string>>(new Set());
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [showOrderingPanel, setShowOrderingPanel] = useState(false);
  const [displayConfig, setDisplayConfig] = useState<{
    categoryOrder?: string[];
    productOrderByCategory?: Record<string, string[]>;
  } | null>(null);
  const [displayConfigSaving, setDisplayConfigSaving] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    description: "",
    price: 0,
    category: "",
    image: "",
    ingredients: "",
    inStock: true,
    loafType: undefined,
    allergens: {
      wheat: false,
      dairy: false,
      milk: false,
      egg: false,
      sesame: false,
    },
    limitedTime: false,
    newProduct: false,
    bakersFavorite: false,
    hiddenFromMenu: false,
    includeInSampleBoxes: false,
  });

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [togglingDates, setTogglingDates] = useState<Set<string>>(new Set());
  const [pickupTimesConfig, setPickupTimesConfig] = useState<Record<string, { startTime: string; endTime: string; blocked?: boolean }> | null>(null);
  const [pickupTimesSaving, setPickupTimesSaving] = useState(false);
  const [pickupWindowDates, setPickupWindowDates] = useState<Record<string, { startTime: string; endTime: string; blocked?: boolean }>>({});
  const [selectedDateForWindow, setSelectedDateForWindow] = useState<string | null>(null);
  const [pickupWindowSaving, setPickupWindowSaving] = useState(false);

  // Gallery state
  const [galleryImages, setGalleryImages] = useState<Array<{id: string; url: string; title?: string; description?: string; date?: string}>>([]);
  const [galleryLoading, setGalleryLoading] = useState(true);
  const [showNewImageForm, setShowNewImageForm] = useState(false);
  const [newImage, setNewImage] = useState({
    url: "",
    title: "",
    description: "",
  });
  const [deletingImages, setDeletingImages] = useState<Set<string>>(new Set());

  // Texts tab (SMS template)
  const [textTemplate, setTextTemplate] = useState("");
  const [textsRemaining, setTextsRemaining] = useState<string | null>(null);
  const [textTemplateLoading, setTextTemplateLoading] = useState(false);
  const [textTemplateSaving, setTextTemplateSaving] = useState(false);
  const [textTemplateTesting, setTextTemplateTesting] = useState(false);

  // Customers state (derived from orders, keyed by phone)
  const [selectedCustomerPhone, setSelectedCustomerPhone] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<{ name: string; phone: string; email: string } | null>(null);
  const [updatingCustomer, setUpdatingCustomer] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem("adminAuthenticated") === "true";
      const authTimestamp = localStorage.getItem("adminAuthTimestamp");
      
      if (authStatus && authTimestamp) {
        const timestamp = parseInt(authTimestamp, 10);
        const now = Date.now();
        const hoursSinceAuth = (now - timestamp) / (1000 * 60 * 60);
        
        if (hoursSinceAuth < 24) {
          // Still authenticated
          setIsAuthenticated(true);
          return;
        } else {
          // Authentication expired
          localStorage.removeItem("adminAuthenticated");
          localStorage.removeItem("adminAuthTimestamp");
        }
      }
      
      // Not authenticated or expired
      setIsAuthenticated(false);
      setShowPasswordModal(true);
    };
    
    checkAuth();
  }, []);

  const handlePasswordSuccess = () => {
    setIsAuthenticated(true);
    setShowPasswordModal(false);
  };

  // Fetch products on mount - needed for displaying bread names in orders
  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    } else if (activeTab === "products") {
      fetchProducts();
      fetchDisplayConfig();
    } else if (activeTab === "calendar") {
      fetchOrders();
      fetchBlockedDates();
      fetchPickupTimes();
      fetchPickupWindowDates();
    } else if (activeTab === "gallery") {
      fetchGalleryImages();
    } else if (activeTab === "texts") {
      fetchTextTemplate();
    } else if (activeTab === "updates") {
      fetchUpdates();
    } else if (activeTab === "customers") {
      fetchOrders();
    }
  }, [activeTab]);

  // Orders functions
  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await fetch("/api/orders");
      if (response.ok) {
        const data = await response.json();
        const sorted = data.sort((a: Order, b: Order) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setOrders(sorted);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchUpdates = async () => {
    try {
      setUpdatesLoading(true);
      const response = await fetch("/api/updates");
      if (response.ok) {
        const data = await response.json();
        const sorted = data.sort(
          (a: UpdateEntry, b: UpdateEntry) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        setUpdates(sorted);
      }
    } catch (error) {
      console.error("Error fetching updates:", error);
    } finally {
      setUpdatesLoading(false);
    }
  };

  const toggleOrderCompleted = async (orderId: string, currentStatus: boolean) => {
    try {
      setUpdatingOrders((prev) => new Set(prev).add(orderId));
      
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: !currentStatus }),
      });

      if (response.ok) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  completed: !currentStatus,
                  completedDate: !currentStatus ? new Date().toISOString() : undefined,
                }
              : order
          )
        );
      } else {
        alert("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Error updating order status");
    } finally {
      setUpdatingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm("Delete this order permanently? This cannot be undone.")) {
      return;
    }

    try {
      setDeletingOrders((prev) => new Set(prev).add(orderId));

      const response = await fetch(`/api/orders/${orderId}`, { method: "DELETE" });

      if (response.ok) {
        setOrders((prev) => prev.filter((order) => order.id !== orderId));
      } else {
        const error = await response.json().catch(() => null);
        alert(error?.error || "Failed to delete order");
      }
    } catch (error) {
      console.error("Error deleting order:", error);
      alert("Error deleting order");
    } finally {
      setDeletingOrders((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleAddUpdate = async () => {
    if (!newUpdate.version || !newUpdate.description || !newUpdate.date) {
      alert("Please provide version, description, and date.");
      return;
    }

    try {
      setSavingUpdate(true);
      const response = await fetch("/api/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUpdate),
      });

      if (response.ok) {
        const created = await response.json();
        setUpdates((prev) =>
          [...prev, created].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          )
        );
        setNewUpdate({ version: "", description: "", date: "" });
      } else {
        const error = await response.json().catch(() => null);
        alert(error?.error || "Failed to add update");
      }
    } catch (error) {
      console.error("Error adding update:", error);
      alert("Error adding update");
    } finally {
      setSavingUpdate(false);
    }
  };

  const handleDeleteUpdate = async (updateId: string) => {
    if (!confirm("Delete this update entry? This cannot be undone.")) {
      return;
    }

    try {
      setDeletingUpdates((prev) => new Set(prev).add(updateId));
      const response = await fetch(`/api/updates/${updateId}`, { method: "DELETE" });

      if (response.ok) {
        setUpdates((prev) => prev.filter((u) => u.id !== updateId));
      } else {
        const error = await response.json().catch(() => null);
        alert(error?.error || "Failed to delete update");
      }
    } catch (error) {
      console.error("Error deleting update:", error);
      alert("Error deleting update");
    } finally {
      setDeletingUpdates((prev) => {
        const next = new Set(prev);
        next.delete(updateId);
        return next;
      });
    }
  };

  // Products functions
  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setProductsLoading(false);
    }
  };

  const fetchDisplayConfig = async () => {
    try {
      const response = await fetch("/api/display-config");
      if (response.ok) {
        const data = await response.json();
        setDisplayConfig(data);
      }
    } catch (error) {
      console.error("Error fetching display config:", error);
    }
  };

  const effectiveDisplayConfig = useMemo(() => {
    const derived = deriveDisplayConfigFromProducts(products);
    if (!displayConfig?.categoryOrder?.length) return derived;
    const orderSet = new Set(displayConfig.categoryOrder);
    const ordered = displayConfig.categoryOrder.filter((c) => derived.categoryOrder.includes(c));
    const rest = derived.categoryOrder.filter((c) => !orderSet.has(c));
    const categoryOrder = [...ordered, ...rest];
    const productOrderByCategory: Record<string, string[]> = {};
    categoryOrder.forEach((cat) => {
      const savedIds = displayConfig.productOrderByCategory?.[cat] || [];
      const derivedIds = derived.productOrderByCategory?.[cat] || [];
      const idSet = new Set(savedIds);
      const orderedIds = savedIds.filter((id) => products.some((p) => p.id === id));
      const restIds = derivedIds.filter((id) => !idSet.has(id));
      productOrderByCategory[cat] = [...orderedIds, ...restIds];
    });
    return { categoryOrder, productOrderByCategory };
  }, [displayConfig, products]);

  const handleSaveDisplayConfig = async () => {
    try {
      setDisplayConfigSaving(true);
      const response = await fetch("/api/display-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(effectiveDisplayConfig),
      });
      if (!response.ok) throw new Error("Failed to save");
      await fetchDisplayConfig();
    } catch (error) {
      console.error("Error saving display config:", error);
      alert("Failed to save product order. Please try again.");
    } finally {
      setDisplayConfigSaving(false);
    }
  };

  const moveCategory = (index: number, direction: "up" | "down") => {
    const cats = [...(effectiveDisplayConfig.categoryOrder || [])];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= cats.length) return;
    [cats[index], cats[swap]] = [cats[swap], cats[index]];
    setDisplayConfig({
      ...effectiveDisplayConfig,
      categoryOrder: cats,
    });
  };

  const moveProduct = (category: string, index: number, direction: "up" | "down") => {
    const ids = [...(effectiveDisplayConfig.productOrderByCategory?.[category] || [])];
    const swap = direction === "up" ? index - 1 : index + 1;
    if (swap < 0 || swap >= ids.length) return;
    [ids[index], ids[swap]] = [ids[swap], ids[index]];
    setDisplayConfig({
      ...effectiveDisplayConfig,
      productOrderByCategory: {
        ...effectiveDisplayConfig.productOrderByCategory,
        [category]: ids,
      },
    });
  };

  const handleProductEdit = (product: Product) => {
    setEditingProduct({ ...product });
    setShowNewProductForm(false); // Close new product form if open
  };

  const handleProductSave = async () => {
    if (!editingProduct) return;

    try {
      setUpdatingProducts((prev) => new Set(prev).add(editingProduct.id));
      
      const response = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingProduct.name,
          description: editingProduct.description,
          price: editingProduct.price,
          category: editingProduct.category,
          image: editingProduct.image,
          ingredients: editingProduct.ingredients,
          inStock: editingProduct.inStock,
          loafType: editingProduct.loafType,
          allergens: editingProduct.allergens,
          limitedTime: editingProduct.limitedTime,
          newProduct: editingProduct.newProduct,
          bakersFavorite: editingProduct.bakersFavorite,
          hiddenFromMenu: editingProduct.hiddenFromMenu ?? false,
          includeInSampleBoxes:
            editingProduct.hiddenFromMenu ? (editingProduct.includeInSampleBoxes ?? false) : false,
        }),
      });

      if (response.ok) {
        const updated = await response.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        setEditingProduct(null);
      } else {
        alert("Failed to update product");
      }
    } catch (error) {
      console.error("Error updating product:", error);
      alert("Error updating product");
    } finally {
      setUpdatingProducts((prev) => {
        const next = new Set(prev);
        next.delete(editingProduct.id);
        return next;
      });
    }
  };

  const handleNewProductSave = async () => {
    if (!newProduct.name || !newProduct.price || !newProduct.category) {
      alert("Please fill in all required fields: Name, Price, and Category");
      return;
    }

    try {
      setUpdatingProducts((prev) => new Set(prev).add("new"));
      
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProduct.name,
          description: newProduct.description || "",
          price: newProduct.price,
          category: newProduct.category,
          image: newProduct.image || "",
          ingredients: newProduct.ingredients || "",
          inStock: newProduct.inStock ?? true,
          loafType: newProduct.loafType,
          allergens:
            newProduct.allergens || { wheat: false, dairy: false, milk: false, egg: false, sesame: false },
          limitedTime: newProduct.limitedTime ?? false,
          newProduct: newProduct.newProduct ?? false,
          bakersFavorite: newProduct.bakersFavorite ?? false,
          hiddenFromMenu: newProduct.hiddenFromMenu ?? false,
          includeInSampleBoxes:
            newProduct.hiddenFromMenu ? (newProduct.includeInSampleBoxes ?? false) : false,
        }),
      });

      if (response.ok) {
        const created = await response.json();
        setProducts((prev) => [...prev, created]);
        // Reset form
        setNewProduct({
          name: "",
          description: "",
          price: 0,
          category: "",
          image: "",
          ingredients: "",
          inStock: true,
          loafType: undefined,
          limitedTime: false,
          newProduct: false,
          bakersFavorite: false,
          hiddenFromMenu: false,
          includeInSampleBoxes: false,
        });
        setShowNewProductForm(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create product");
      }
    } catch (error) {
      console.error("Error creating product:", error);
      alert("Error creating product");
    } finally {
      setUpdatingProducts((prev) => {
        const next = new Set(prev);
        next.delete("new");
        return next;
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product? This action cannot be undone.")) {
      return;
    }

    try {
      setDeletingProducts((prev) => new Set(prev).add(productId));
      
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        if (editingProduct?.id === productId) {
          setEditingProduct(null);
        }
      } else {
        alert("Failed to delete product");
      }
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error deleting product");
    } finally {
      setDeletingProducts((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  // Calendar functions
  const fetchBlockedDates = async () => {
    try {
      setCalendarLoading(true);
      const response = await fetch("/api/blocked-dates");
      if (response.ok) {
        const data = await response.json();
        setBlockedDates(data);
      }
    } catch (error) {
      console.error("Error fetching blocked dates:", error);
    } finally {
      setCalendarLoading(false);
    }
  };

  const fetchPickupTimes = async () => {
    try {
      const response = await fetch("/api/pickup-times");
      if (response.ok) {
        const data = await response.json();
        setPickupTimesConfig(data);
      }
    } catch (error) {
      console.error("Error fetching pickup times:", error);
    }
  };

  const fetchPickupWindowDates = async () => {
    try {
      const response = await fetch("/api/pickup-window-dates");
      if (response.ok) {
        const data = await response.json();
        setPickupWindowDates(data);
      }
    } catch (error) {
      console.error("Error fetching pickup window dates:", error);
    }
  };

  const handlePickupTimeChange = (
    dayKey: string,
    field: "startTime" | "endTime",
    value: string
  ) => {
    setPickupTimesConfig((prev) => {
      const next = { ...(prev || {}) };
      const existing = next[dayKey] || { startTime: "12:00 PM", endTime: "6:00 PM" };
      next[dayKey] = { ...existing, [field]: value };
      return next;
    });
  };

  const handlePickupBlockedToggle = (dayKey: string) => {
    setPickupTimesConfig((prev) => {
      const next = { ...(prev || {}) };
      const existing = next[dayKey] || { startTime: "12:00 PM", endTime: "6:00 PM" };
      next[dayKey] = { ...existing, blocked: !existing.blocked };
      return next;
    });
  };

  const handleSavePickupTimes = async () => {
    if (!pickupTimesConfig) return;
    try {
      setPickupTimesSaving(true);
      const response = await fetch("/api/pickup-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pickupTimes: pickupTimesConfig }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        alert(error?.error || "Failed to save pickup times");
        return;
      }
      await fetchPickupTimes();
    } catch (error) {
      console.error("Error saving pickup times:", error);
      alert("Error saving pickup times. Please try again.");
    } finally {
      setPickupTimesSaving(false);
    }
  };

  const fetchTextTemplate = async () => {
    try {
      setTextTemplateLoading(true);
      const [templateRes, remainingRes] = await Promise.all([
        fetch(`/api/settings?label=${encodeURIComponent(TEXTING_MESSAGE_SETTING_LABEL)}`),
        fetch(`/api/settings?label=${encodeURIComponent(TEXTS_REMAINING_SETTING_LABEL)}`),
      ]);
      if (templateRes.ok) {
        const setting = await templateRes.json();
        setTextTemplate(setting?.value || "");
      }
      if (remainingRes.ok) {
        const setting = await remainingRes.json();
        setTextsRemaining(setting?.value ?? null);
      }
    } catch (error) {
      console.error("Error fetching text template:", error);
    } finally {
      setTextTemplateLoading(false);
    }
  };

  const handleSaveTextTemplate = async () => {
    try {
      setTextTemplateSaving(true);
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: TEXTING_MESSAGE_SETTING_LABEL,
          value: textTemplate,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        alert(error?.error || "Failed to save text template");
        return;
      }
      await fetchTextTemplate();
    } catch (error) {
      console.error("Error saving text template:", error);
      alert("Error saving text template. Please try again.");
    } finally {
      setTextTemplateSaving(false);
    }
  };

  const handleTestTextTemplate = async () => {
    if (!textTemplate.trim()) {
      alert("Enter a text template before sending a test.");
      return;
    }

    try {
      setTextTemplateTesting(true);
      const response = await fetch("/api/admin/test-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textTemplate }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        alert(data?.error || "Failed to send test text");
        return;
      }
      if (data?.quotaRemaining !== undefined) {
        setTextsRemaining(String(data.quotaRemaining));
      }
      alert("Test text sent to admin phone.");
    } catch (error) {
      console.error("Error sending test text:", error);
      alert("Error sending test text. Please try again.");
    } finally {
      setTextTemplateTesting(false);
    }
  };

  const getEffectiveWindowForDate = (date: Date) => {
    const dateStr = formatDateInput(date);
    const override = pickupWindowDates[dateStr];
    if (override) return override;
    const dayKey = String(date.getDay());
    return pickupTimesConfig?.[dayKey] || { startTime: "12:00 PM", endTime: "6:00 PM" };
  };

  // Get weekday-only window (no date override) for "Use default" display
  const getWeekdayWindowForDate = (date: Date) => {
    const dayKey = String(date.getDay());
    return pickupTimesConfig?.[dayKey] || { startTime: "12:00 PM", endTime: "6:00 PM" };
  };

  const handleSavePickupWindowForDate = async (
    date: string,
    window: { startTime: string; endTime: string; blocked?: boolean }
  ) => {
    try {
      setPickupWindowSaving(true);
      const response = await fetch("/api/pickup-window-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, window }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        alert(err?.error || "Failed to save");
        return;
      }
      await fetchPickupWindowDates();
      setSelectedDateForWindow(null);
    } catch (error) {
      console.error("Error saving pickup window:", error);
      alert("Failed to save. Please try again.");
    } finally {
      setPickupWindowSaving(false);
    }
  };

  const handleRemovePickupWindowForDate = async (date: string) => {
    try {
      setPickupWindowSaving(true);
      const response = await fetch(`/api/pickup-window-dates?date=${encodeURIComponent(date)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const err = await response.json().catch(() => null);
        alert(err?.error || "Failed to remove");
        return;
      }
      await fetchPickupWindowDates();
      setSelectedDateForWindow(null);
    } catch (error) {
      console.error("Error removing pickup window:", error);
      alert("Failed to remove. Please try again.");
    } finally {
      setPickupWindowSaving(false);
    }
  };

  const toggleBlockedDate = async (date: string) => {
    try {
      setTogglingDates((prev) => new Set(prev).add(date));
      
      const response = await fetch("/api/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", date }),
      });

      if (response.ok) {
        const updated = await response.json();
        setBlockedDates(updated);
      } else {
        alert("Failed to update blocked date");
      }
    } catch (error) {
      console.error("Error toggling blocked date:", error);
      alert("Error updating blocked date");
    } finally {
      setTogglingDates((prev) => {
        const next = new Set(prev);
        next.delete(date);
        return next;
      });
    }
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const formatDateString = (date: Date) => {
    return formatDateInput(date);
  };

  const getOrdersForDate = (date: Date) => {
    const dateStr = formatDateString(date);
    return orders.filter((order) => {
      if (order.completed || !order.pickupDate) return false;
      const parsedPickup = parseLocalDateString(order.pickupDate);
      if (!parsedPickup) return false;
      return formatDateString(parsedPickup) === dateStr;
    });
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      if (direction === "prev") {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  // Gallery functions
  const fetchGalleryImages = async () => {
    try {
      setGalleryLoading(true);
      const response = await fetch("/api/gallery");
      if (response.ok) {
        const data = await response.json();
        setGalleryImages(data);
      }
    } catch (error) {
      console.error("Error fetching gallery images:", error);
    } finally {
      setGalleryLoading(false);
    }
  };

  const handleAddGalleryImage = async () => {
    if (!newImage.url) {
      alert("Please provide an image URL");
      return;
    }

    try {
      setDeletingImages((prev) => new Set(prev).add("new"));
      
      const response = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newImage.url,
          title: newImage.title || undefined,
          description: newImage.description || undefined,
          date: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        const created = await response.json();
        setGalleryImages((prev) => [...prev, created]);
        setNewImage({ url: "", title: "", description: "" });
        setShowNewImageForm(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to add image");
      }
    } catch (error) {
      console.error("Error adding gallery image:", error);
      alert("Error adding image");
    } finally {
      setDeletingImages((prev) => {
        const next = new Set(prev);
        next.delete("new");
        return next;
      });
    }
  };

  const handleDeleteGalleryImage = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image?")) {
      return;
    }

    try {
      setDeletingImages((prev) => new Set(prev).add(imageId));
      
      const response = await fetch(`/api/gallery/${imageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setGalleryImages((prev) => prev.filter((img) => img.id !== imageId));
      } else {
        alert("Failed to delete image");
      }
    } catch (error) {
      console.error("Error deleting gallery image:", error);
      alert("Error deleting image");
    } finally {
      setDeletingImages((prev) => {
        const next = new Set(prev);
        next.delete(imageId);
        return next;
      });
    }
  };

  const todayPickupDate = formatDateInput(new Date());
  const tomorrowPickupDate = formatDateInput(
    new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1)
  );

  const filteredOrders = orders.filter((order) => {
    if (filter === "pending") return !order.completed && !order.cancelled;
    if (filter === "completed") return order.completed && !order.cancelled;
    if (filter === "cancelled") return order.cancelled;
    if (filter === "today") return order.pickupDate === todayPickupDate;
    if (filter === "tomorrow") return order.pickupDate === tomorrowPickupDate;
    return true;
  });

  const pendingCount = orders.filter((o) => !o.completed && !o.cancelled).length;
  const completedCount = orders.filter((o) => o.completed && !o.cancelled).length;
  const cancelledCount = orders.filter((o) => o.cancelled).length;
  const todayCount = orders.filter((o) => o.pickupDate === todayPickupDate).length;
  const tomorrowCount = orders.filter((o) => o.pickupDate === tomorrowPickupDate).length;

  // Normalize phone for customer key (digits only; US 11-digit → 10)
  const normalizePhoneKey = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
    return digits;
  };

  // Derive customers from orders (primary key = normalized phone)
  const customersList = useMemo(() => {
    const byPhone = new Map<string, Order[]>();
    orders.forEach((order) => {
      const key = normalizePhoneKey(order.phone);
      if (!byPhone.has(key)) byPhone.set(key, []);
      byPhone.get(key)!.push(order);
    });
    return Array.from(byPhone.entries())
      .map(([phoneKey, orderList]) => {
        const sorted = [...orderList].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const mostRecent = sorted[0];
        return {
          phoneKey,
          name: mostRecent.customerName,
          phone: mostRecent.phone,
          email: mostRecent.email?.trim() || "",
          orderCount: sorted.length,
          orders: sorted,
        };
      })
      .sort((a, b) => new Date(b.orders[0].date).getTime() - new Date(a.orders[0].date).getTime());
  }, [orders]);

  const selectedCustomer = selectedCustomerPhone
    ? customersList.find((c) => normalizePhoneKey(c.phone) === selectedCustomerPhone)
    : null;

  const handleUpdateCustomerInfo = async () => {
    if (!editingCustomer || !selectedCustomerPhone) return;
    const { name, phone, email } = editingCustomer;
    if (!name.trim() || !phone.trim()) {
      alert("Name and phone are required.");
      return;
    }
    const ordersToUpdate = orders.filter((o) => normalizePhoneKey(o.phone) === selectedCustomerPhone);
    setUpdatingCustomer(true);
    try {
      for (const order of ordersToUpdate) {
        const res = await fetch(`/api/orders/${order.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerName: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error("Failed to update order");
      }
      await fetchOrders();
      setSelectedCustomerPhone(normalizePhoneKey(phone));
      setEditingCustomer(null);
    } catch (e) {
      console.error(e);
      alert("Failed to update customer info. Please try again.");
    } finally {
      setUpdatingCustomer(false);
    }
  };

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-tan-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show password modal if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-tan-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-gray-600">Please authenticate to access the admin panel.</p>
          </div>
        </main>
        <AdminPasswordModal
          isOpen={showPasswordModal}
          onClose={() => router.push("/")}
          onSuccess={handlePasswordSuccess}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage orders, products, calendar, gallery, and analytics</p>
        </div>

              {/* Tabs */}
              <div className="mb-4 sm:mb-6 border-b border-gray-200 overflow-x-auto">
                <div className="flex gap-1 sm:gap-2 min-w-max">
                  <button
                    onClick={() => setActiveTab("orders")}
                    className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === "orders"
                        ? "border-brown-600 text-brown-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Orders
                  </button>
                  <button
                    onClick={() => setActiveTab("products")}
                    className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === "products"
                        ? "border-brown-600 text-brown-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Edit Products
                  </button>
                  <button
                    onClick={() => setActiveTab("calendar")}
                    className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === "calendar"
                        ? "border-brown-600 text-brown-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Calendar
                  </button>
                  <button
                    onClick={() => setActiveTab("gallery")}
                    className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === "gallery"
                        ? "border-brown-600 text-brown-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Gallery
                  </button>
                  <button
                    onClick={() => setActiveTab("texts")}
                    className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === "texts"
                        ? "border-brown-600 text-brown-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Texts
                  </button>
                  <Link
                    href="/admin/analytics"
                    className="px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap border-transparent text-gray-600 hover:text-gray-900 inline-flex items-center"
                  >
                    Analytics
                  </Link>
                  <button
                    onClick={() => setActiveTab("updates")}
                    className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === "updates"
                        ? "border-brown-600 text-brown-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Updates
                  </button>
                  <button
                    onClick={() => setActiveTab("customers")}
                    className={`px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-medium transition-colors border-b-2 whitespace-nowrap ${
                      activeTab === "customers"
                        ? "border-brown-600 text-brown-600"
                        : "border-transparent text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    Customers
                  </button>
                </div>
              </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <>
            {ordersLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading orders...</p>
              </div>
            ) : (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-sm font-medium text-gray-600">Total Orders</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-sm font-medium text-gray-600">Pending</h3>
                    <p className="text-3xl font-bold text-orange-600 mt-2">{pendingCount}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-sm font-medium text-gray-600">Completed</h3>
                    <p className="text-3xl font-bold text-green-600 mt-2">{completedCount}</p>
                  </div>
                </div>

                {/* Filter Buttons */}
                <div className="mb-6 flex flex-wrap gap-2">
                  <button
                    onClick={() => setFilter("all")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === "all"
                        ? "bg-brown-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    All ({orders.length})
                  </button>
                  <button
                    onClick={() => setFilter("pending")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === "pending"
                        ? "bg-brown-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Pending ({pendingCount})
                  </button>
                  <button
                    onClick={() => setFilter("completed")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === "completed"
                        ? "bg-brown-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                  <button
                    onClick={() => setFilter("cancelled")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === "cancelled"
                        ? "bg-brown-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Cancelled ({cancelledCount})
                  </button>
                  <button
                    onClick={() => setFilter("today")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === "today"
                        ? "bg-brown-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Today ({todayCount})
                  </button>
                  <button
                    onClick={() => setFilter("tomorrow")}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      filter === "tomorrow"
                        ? "bg-brown-600 text-white"
                        : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    Tomorrow ({tomorrowCount})
                  </button>
                </div>

                {/* Orders List */}
                {filteredOrders.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-600">No orders found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredOrders.map((order) => (
                      <div
                        key={order.id}
                        className={`bg-white rounded-lg shadow-md p-6 ${
                          order.completed ? "opacity-75" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold text-gray-900">
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
                              {new Date(order.date).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!order.cancelled && (
                              <button
                                onClick={() => toggleOrderCompleted(order.id, order.completed || false)}
                                disabled={updatingOrders.has(order.id) || deletingOrders.has(order.id)}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                  order.completed
                                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                                    : "bg-green-600 text-white hover:bg-green-700"
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {updatingOrders.has(order.id)
                                  ? "Updating..."
                                  : order.completed
                                  ? "Mark as Pending"
                                  : "Mark as Completed"}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteOrder(order.id)}
                              disabled={deletingOrders.has(order.id) || updatingOrders.has(order.id)}
                              title="Delete order"
                              aria-label="Delete order"
                              className="h-9 w-9 flex items-center justify-center rounded-full font-bold transition-colors bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {deletingOrders.has(order.id) ? "…" : "×"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm font-medium text-gray-600">Customer</p>
                            <p className="text-gray-900">{order.customerName}</p>
                            <p className="text-gray-700 text-sm">{order.phone}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-600">Payment</p>
                            <p className="text-gray-900 capitalize">
                              {order.paymentMethod === "cash"
                                ? "Cash (at pickup)"
                                : "Venmo (pre-pay)"}
                            </p>
                          </div>
                          {order.pickupDate && order.pickupTime && (
                            <div>
                              <p className="text-sm font-medium text-gray-600">Pickup</p>
                              <p className="text-gray-900">
                                {formatPickupDisplay(order.pickupDate, {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                at {order.pickupTime}
                              </p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-600">Total</p>
                            <p className="text-xl font-bold text-gray-900">
                              ${order.total.toFixed(2)}
                            </p>
                          </div>
                          {order.heardAboutUs && (
                            <div className="md:col-span-2">
                              <p className="text-sm font-medium text-gray-600">Heard about us</p>
                              <p className="text-gray-900">{order.heardAboutUs}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-600">Text sent</p>
                            <p className="text-gray-900">
                              {order.reminderSentAt
                                ? new Date(order.reminderSentAt).toLocaleString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "No"}
                            </p>
                          </div>
                        </div>

                        <div className="border-t pt-4">
                          <p className="text-sm font-medium text-gray-600 mb-2">Items</p>
                          <div className="space-y-2">
                            {order.items.map((item, index) => (
                              <div key={index} className="text-sm text-gray-700">
                                <div className="flex justify-between">
                                  <span className="flex items-center gap-2">
                                    {item.product.name} × {item.quantity}
                                    {item.cut && (
                                      <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-900">
                                        Cut
                                      </span>
                                    )}
                                  </span>
                                  <span>
                                    ${(item.product.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                                {(item.product.loafType === "mini" || item.product.loafType === "half") && item.selectedBreads && item.selectedBreads.length > 0 && (
                                  <div className="ml-4 mt-1 text-xs text-gray-600">
                                    <p className="font-medium mb-1">Selected Breads:</p>
                                    <ul className="list-disc list-inside">
                                      {item.selectedBreads.map((breadId, idx) => {
                                        const bread = products.find((p) => p.id === breadId);
                                        return <li key={idx}>{bread?.name || breadId}</li>;
                                      })}
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
                              Cancelled on:{" "}
                              {new Date(order.cancelledDate).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        )}

                        {order.completed && order.completedDate && !order.cancelled && (
                          <div className="mt-4 pt-4 border-t">
                            <p className="text-sm text-gray-600">
                              Completed on:{" "}
                              {new Date(order.completedDate).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
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
          </>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <>
            {productsLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading products...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Add New Product Button */}
                <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Products</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowOrderingPanel(!showOrderingPanel)}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        showOrderingPanel
                          ? "bg-brown-700 text-white"
                          : "bg-brown-100 text-brown-700 hover:bg-brown-200"
                      }`}
                    >
                      Product ordering
                    </button>
                    <button
                      onClick={() => {
                        setShowNewProductForm(!showNewProductForm);
                        setEditingProduct(null); // Close any open edit forms
                      }}
                      className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors"
                    >
                      {showNewProductForm ? "Cancel" : "+ Add New Product"}
                    </button>
                  </div>
                </div>

                {/* Product Ordering Panel */}
                {showOrderingPanel && (
                  <div className="bg-white rounded-lg shadow-md p-6 border-2 border-brown-200 mb-4">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Product display order</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Reorder categories and products to control how they appear on the main page.
                    </p>
                    <div className="space-y-6">
                      {(effectiveDisplayConfig.categoryOrder || []).map((category, catIndex) => (
                        <div key={category} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-semibold text-gray-900">{category}</span>
                            <div className="flex gap-1">
                              <button
                                onClick={() => moveCategory(catIndex, "up")}
                                disabled={catIndex === 0}
                                className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Move category up"
                              >
                                ↑
                              </button>
                              <button
                                onClick={() => moveCategory(catIndex, "down")}
                                disabled={catIndex === (effectiveDisplayConfig.categoryOrder?.length ?? 0) - 1}
                                className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Move category down"
                              >
                                ↓
                              </button>
                            </div>
                          </div>
                          <ul className="space-y-1 pl-2">
                            {(effectiveDisplayConfig.productOrderByCategory?.[category] || []).map((productId, prodIndex) => {
                              const product = products.find((p) => p.id === productId);
                              return (
                                <li key={productId} className="flex items-center justify-between py-1">
                                  <span className="text-sm text-gray-700">
                                    {product?.name ?? productId}
                                  </span>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => moveProduct(category, prodIndex, "up")}
                                      disabled={prodIndex === 0}
                                      className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                                      title="Move product up"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      onClick={() => moveProduct(category, prodIndex, "down")}
                                      disabled={prodIndex === (effectiveDisplayConfig.productOrderByCategory?.[category]?.length ?? 0) - 1}
                                      className="p-1 rounded bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs"
                                      title="Move product down"
                                    >
                                      ↓
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleSaveDisplayConfig}
                        disabled={displayConfigSaving}
                        className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {displayConfigSaving ? "Saving…" : "Save order"}
                      </button>
                    </div>
                  </div>
                )}

                {/* New Product Form */}
                {showNewProductForm && (
                  <div className="bg-white rounded-lg shadow-md p-6 border-2 border-brown-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Product</h3>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Name *
                          </label>
                          <input
                            type="text"
                            value={newProduct.name || ""}
                            onChange={(e) =>
                              setNewProduct({ ...newProduct, name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            placeholder="Product name"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price ($) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newProduct.price || 0}
                            onChange={(e) =>
                              setNewProduct({
                                ...newProduct,
                                price: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category *
                          </label>
                          <input
                            type="text"
                            value={newProduct.category || ""}
                            onChange={(e) =>
                              setNewProduct({
                                ...newProduct,
                                category: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            placeholder="e.g., Bread, Bakery Items"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Image URL
                          </label>
                          <input
                            type="text"
                            value={newProduct.image || ""}
                            onChange={(e) =>
                              setNewProduct({
                                ...newProduct,
                                image: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            placeholder="/images/product.jpg"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={newProduct.description || ""}
                            onChange={(e) =>
                              setNewProduct({
                                ...newProduct,
                                description: e.target.value,
                              })
                            }
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            placeholder="Product description"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ingredients
                          </label>
                          <input
                            type="text"
                            value={newProduct.ingredients || ""}
                            onChange={(e) =>
                              setNewProduct({
                                ...newProduct,
                                ingredients: e.target.value,
                              })
                            }
                            placeholder="e.g., Flour, Water, Salt, Yeast"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            List ingredients separated by commas
                          </p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newProduct.inStock ?? true}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  inStock: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              In Stock
                            </span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newProduct.loafType === "mini"}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  loafType: e.target.checked ? "mini" : undefined,
                                })
                              }
                              className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Mini Loaf Box (requires bread selection)
                            </span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newProduct.limitedTime ?? false}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  limitedTime: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Limited time product
                            </span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newProduct.newProduct ?? false}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  newProduct: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              New product
                            </span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newProduct.bakersFavorite ?? false}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  bakersFavorite: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Baker&apos;s favorite
                            </span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={newProduct.hiddenFromMenu ?? false}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  hiddenFromMenu: e.target.checked,
                                    includeInSampleBoxes: e.target.checked
                                      ? (newProduct.includeInSampleBoxes ?? false)
                                      : false,
                                })
                              }
                              className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Hide from order menu
                            </span>
                          </label>
                            {(newProduct.hiddenFromMenu ?? false) && (
                              <label className="ml-6 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={newProduct.includeInSampleBoxes ?? false}
                                  onChange={(e) =>
                                    setNewProduct({
                                      ...newProduct,
                                      includeInSampleBoxes: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                  Still include in the sample boxes?
                                </span>
                              </label>
                            )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Allergens
                          </label>
                          <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={newProduct.allergens?.wheat ?? false}
                                onChange={(e) =>
                                  setNewProduct({
                                    ...newProduct,
                                    allergens: {
                                      ...newProduct.allergens,
                                      wheat: e.target.checked,
                                    },
                                  })
                                }
                                className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">Wheat</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={newProduct.allergens?.dairy ?? false}
                                onChange={(e) =>
                                  setNewProduct({
                                    ...newProduct,
                                    allergens: {
                                      ...newProduct.allergens,
                                      dairy: e.target.checked,
                                    },
                                  })
                                }
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">Dairy</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={newProduct.allergens?.milk ?? false}
                                onChange={(e) =>
                                  setNewProduct({
                                    ...newProduct,
                                    allergens: {
                                      ...newProduct.allergens,
                                      milk: e.target.checked,
                                    },
                                  })
                                }
                                className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">Milk</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={newProduct.allergens?.egg ?? false}
                                onChange={(e) =>
                                  setNewProduct({
                                    ...newProduct,
                                    allergens: {
                                      ...newProduct.allergens,
                                      egg: e.target.checked,
                                    },
                                  })
                                }
                                className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">Egg</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={newProduct.allergens?.sesame ?? false}
                                onChange={(e) =>
                                  setNewProduct({
                                    ...newProduct,
                                    allergens: {
                                      ...newProduct.allergens,
                                      sesame: e.target.checked,
                                    },
                                  })
                                }
                                className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                              />
                              <span className="text-sm text-gray-700">Sesame</span>
                            </label>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleNewProductSave}
                          disabled={updatingProducts.has("new")}
                          className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors disabled:opacity-50"
                        >
                          {updatingProducts.has("new") ? "Creating..." : "Create Product"}
                        </button>
                        <button
                          onClick={() => {
                            setShowNewProductForm(false);
                            setNewProduct({
                              name: "",
                              description: "",
                              price: 0,
                              category: "",
                              image: "",
                              ingredients: "",
                              inStock: true,
                              loafType: undefined,
                              allergens: { wheat: false, dairy: false, milk: false, egg: false, sesame: false },
                              limitedTime: false,
                              newProduct: false,
                              bakersFavorite: false,
                              hiddenFromMenu: false,
                              includeInSampleBoxes: false,
                            });
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Existing Products List */}
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-lg shadow-md p-6"
                  >
                    {editingProduct?.id === product.id ? (
                      // Edit mode
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={editingProduct.name}
                              onChange={(e) =>
                                setEditingProduct({ ...editingProduct, name: e.target.value })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Price ($)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingProduct.price}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  price: parseFloat(e.target.value) || 0,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Category
                            </label>
                            <input
                              type="text"
                              value={editingProduct.category}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  category: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Image URL
                            </label>
                            <input
                              type="text"
                              value={editingProduct.image}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  image: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description
                            </label>
                            <textarea
                              value={editingProduct.description}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  description: e.target.value,
                                })
                              }
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Ingredients
                            </label>
                            <input
                              type="text"
                              value={editingProduct.ingredients || ""}
                              onChange={(e) =>
                                setEditingProduct({
                                  ...editingProduct,
                                  ingredients: e.target.value,
                                })
                              }
                              placeholder="e.g., Flour, Water, Salt, Yeast"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              List ingredients separated by commas
                            </p>
                          </div>
                          <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editingProduct.inStock}
                                onChange={(e) =>
                                  setEditingProduct({
                                    ...editingProduct,
                                    inStock: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                In Stock
                              </span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editingProduct.loafType === "mini"}
                                onChange={(e) =>
                                  setEditingProduct({
                                    ...editingProduct,
                                    loafType: e.target.checked ? "mini" : undefined,
                                  })
                                }
                                className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Mini Loaf Box (requires bread selection)
                              </span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editingProduct.limitedTime ?? false}
                                onChange={(e) =>
                                  setEditingProduct({
                                    ...editingProduct,
                                    limitedTime: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Limited time product
                              </span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editingProduct.newProduct ?? false}
                                onChange={(e) =>
                                  setEditingProduct({
                                    ...editingProduct,
                                    newProduct: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                New product
                              </span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editingProduct.bakersFavorite ?? false}
                                onChange={(e) =>
                                  setEditingProduct({
                                    ...editingProduct,
                                    bakersFavorite: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Baker&apos;s favorite
                              </span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={editingProduct.hiddenFromMenu ?? false}
                                onChange={(e) =>
                                  setEditingProduct({
                                    ...editingProduct,
                                    hiddenFromMenu: e.target.checked,
                                    includeInSampleBoxes: e.target.checked
                                      ? (editingProduct.includeInSampleBoxes ?? false)
                                      : false,
                                  })
                                }
                                className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Hide from order menu
                              </span>
                            </label>
                            {(editingProduct.hiddenFromMenu ?? false) && (
                              <label className="ml-6 flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingProduct.includeInSampleBoxes ?? false}
                                  onChange={(e) =>
                                    setEditingProduct({
                                      ...editingProduct,
                                      includeInSampleBoxes: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                  Still include in the sample boxes?
                                </span>
                              </label>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Allergens
                            </label>
                            <div className="flex flex-wrap gap-4">
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingProduct.allergens?.wheat ?? false}
                                  onChange={(e) =>
                                    setEditingProduct({
                                      ...editingProduct,
                                      allergens: {
                                        ...editingProduct.allergens,
                                        wheat: e.target.checked,
                                      },
                                    })
                                  }
                                  className="w-4 h-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Wheat</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingProduct.allergens?.dairy ?? false}
                                  onChange={(e) =>
                                    setEditingProduct({
                                      ...editingProduct,
                                      allergens: {
                                        ...editingProduct.allergens,
                                        dairy: e.target.checked,
                                      },
                                    })
                                  }
                                  className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Dairy</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingProduct.allergens?.milk ?? false}
                                  onChange={(e) =>
                                    setEditingProduct({
                                      ...editingProduct,
                                      allergens: {
                                        ...editingProduct.allergens,
                                        milk: e.target.checked,
                                      },
                                    })
                                  }
                                  className="w-4 h-4 text-cyan-600 focus:ring-cyan-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Milk</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingProduct.allergens?.egg ?? false}
                                  onChange={(e) =>
                                    setEditingProduct({
                                      ...editingProduct,
                                      allergens: {
                                        ...editingProduct.allergens,
                                        egg: e.target.checked,
                                      },
                                    })
                                  }
                                  className="w-4 h-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Egg</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={editingProduct.allergens?.sesame ?? false}
                                  onChange={(e) =>
                                    setEditingProduct({
                                      ...editingProduct,
                                      allergens: {
                                        ...editingProduct.allergens,
                                        sesame: e.target.checked,
                                      },
                                    })
                                  }
                                  className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                />
                                <span className="text-sm text-gray-700">Sesame</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleProductSave}
                            disabled={updatingProducts.has(product.id)}
                            className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors disabled:opacity-50"
                          >
                            {updatingProducts.has(product.id) ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setEditingProduct(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={deletingProducts.has(product.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {deletingProducts.has(product.id) ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // View mode
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-bold text-gray-900">
                              {product.name}
                            </h3>
                            <span className="px-3 py-1 bg-brown-100 text-brown-800 text-sm font-medium rounded-full">
                              {product.category}
                            </span>
                            {!product.inStock && (
                              <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full">
                                Out of Stock
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-2">{product.description}</p>
                          <p className="text-2xl font-bold text-gray-900">
                            ${product.price.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleProductEdit(product)}
                            className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={deletingProducts.has(product.id)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                          >
                            {deletingProducts.has(product.id) ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Calendar Tab */}
        {activeTab === "calendar" && (
          <>
            {calendarLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading calendar...</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                {/* Calendar Header */}
                <div className="flex justify-between items-center mb-6">
                  <button
                    onClick={() => navigateMonth("prev")}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    ← Previous
                  </button>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {currentMonth.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>
                  <button
                    onClick={() => navigateMonth("next")}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Next →
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {/* Day Headers */}
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="text-center font-semibold text-gray-700 py-2"
                      >
                        {day}
                      </div>
                    )
                  )}

                  {/* Calendar Days */}
                  {getDaysInMonth(currentMonth).map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="h-24" />;
                    }

                    const dateStr = formatDateString(date);
                    const isBlockedByDate = blockedDates.includes(dateStr);
                    const isBlockedByWeekday = !!pickupTimesConfig?.[String(date.getDay())]?.blocked;
                    const isBlocked = isBlockedByDate || isBlockedByWeekday;
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    const isToday =
                      formatDateString(date) === formatDateString(new Date());
                    const ordersForDate = getOrdersForDate(date);
                    const canBlock = !isPast;

                    const hasDateOverride = !!pickupWindowDates[dateStr];
                    return (
                      <div
                        key={dateStr}
                        onClick={() => !isPast && setSelectedDateForWindow(dateStr)}
                        role="button"
                        tabIndex={isPast ? -1 : 0}
                        onKeyDown={(e) => !isPast && (e.key === "Enter" || e.key === " ") && setSelectedDateForWindow(dateStr)}
                        className={`min-h-24 border rounded-lg p-2 ${
                          isToday
                            ? "bg-brown-50 border-brown-300"
                            : isBlocked
                            ? "bg-red-50 border-red-300"
                            : "bg-gray-50 border-gray-200"
                        } ${isPast ? "opacity-50" : "cursor-pointer hover:ring-2 hover:ring-brown-400"} ${hasDateOverride ? "ring-1 ring-blue-300" : ""}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span
                            className={`text-sm font-medium ${
                              isToday
                                ? "text-brown-700"
                                : isBlocked
                                ? "text-red-700"
                                : "text-gray-700"
                            }`}
                          >
                            {date.getDate()}
                            {hasDateOverride && (
                              <span className="ml-1 text-blue-600" title="Custom pickup window">●</span>
                            )}
                          </span>
                          {canBlock && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleBlockedDate(dateStr);
                              }}
                              disabled={togglingDates.has(dateStr)}
                              className={`text-xs px-2 py-1 rounded ${
                                isBlocked
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                              } disabled:opacity-50 transition-colors`}
                              title={
                                isBlocked
                                  ? "Click to unblock this date"
                                  : "Click to block this date"
                              }
                            >
                              {togglingDates.has(dateStr)
                                ? "..."
                                : isBlocked
                                ? "Unblock"
                                : "Block"}
                            </button>
                          )}
                        </div>
                        {isBlocked && (
                          <div className="text-xs text-red-600 font-medium mb-1">
                            Blocked
                          </div>
                        )}
                        {ordersForDate.length > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs font-semibold text-orange-600">
                              {ordersForDate.length} order
                              {ordersForDate.length > 1 ? "s" : ""}
                            </div>
                            {ordersForDate.slice(0, 2).map((order) => (
                              <div
                                key={order.id}
                                className="text-xs bg-orange-100 text-orange-800 px-1 py-0.5 rounded truncate"
                                title={`${order.customerName} - $${order.total.toFixed(2)}`}
                              >
                                {order.customerName} - ${order.total.toFixed(2)}
                              </div>
                            ))}
                            {ordersForDate.length > 2 && (
                              <div className="text-xs text-orange-600">
                                +{ordersForDate.length - 2} more
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pickup window modal for specific date */}
                {selectedDateForWindow && (
                  <PickupWindowDateModal
                    date={selectedDateForWindow}
                    window={pickupWindowDates[selectedDateForWindow] ?? getEffectiveWindowForDate(parseLocalDateString(selectedDateForWindow)!)}
                    defaultWindow={getWeekdayWindowForDate(parseLocalDateString(selectedDateForWindow)!)}
                    hasOverride={!!pickupWindowDates[selectedDateForWindow]}
                    onClose={() => setSelectedDateForWindow(null)}
                    onSave={handleSavePickupWindowForDate}
                    onRemoveOverride={handleRemovePickupWindowForDate}
                    saving={pickupWindowSaving}
                    timeOptions={PICKUP_TIME_OPTIONS}
                  />
                )}

                {/* Legend */}
                <div className="mt-6 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-brown-50 border border-brown-300 rounded"></div>
                    <span>Today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-50 border border-red-300 rounded"></div>
                    <span>Blocked Date</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-100 rounded"></div>
                    <span>Pending Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-600">●</span>
                    <span>Custom pickup window (click day to edit)</span>
                  </div>
                </div>

                {/* Pickup time configuration */}
                <div className="mt-8 border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Pickup Time Windows
                  </h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Configure the default pickup start and end times for each day of the week.
                    These times are used to generate the 30-minute time slots on the checkout page
                    and for the next available pickup banner.
                  </p>
                  {/* Mobile: card layout for clearer display */}
                  <div className="space-y-3 md:hidden">
                    {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(
                      (label, idx) => {
                        const key = String(idx);
                        const window = pickupTimesConfig?.[key] || {
                          startTime: "12:00 PM",
                          endTime: "6:00 PM",
                        };
                        const isBlocked = !!window.blocked;
                        return (
                          <div
                            key={key}
                            className={`rounded-lg border p-4 space-y-3 ${isBlocked ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}
                          >
                            <div className="font-semibold text-gray-900">{label}</div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Start</label>
                                <select
                                  value={PICKUP_TIME_OPTIONS.includes(window.startTime) ? window.startTime : "12:00 PM"}
                                  onChange={(e) =>
                                    handlePickupTimeChange(key, "startTime", e.target.value)
                                  }
                                  disabled={isBlocked}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-brown-500 focus:border-brown-500 disabled:bg-gray-100 disabled:text-gray-500"
                                >
                                  {PICKUP_TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">End</label>
                                <select
                                  value={PICKUP_TIME_OPTIONS.includes(window.endTime) ? window.endTime : "6:00 PM"}
                                  onChange={(e) =>
                                    handlePickupTimeChange(key, "endTime", e.target.value)
                                  }
                                  disabled={isBlocked}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-brown-500 focus:border-brown-500 disabled:bg-gray-100 disabled:text-gray-500"
                                >
                                  {PICKUP_TIME_OPTIONS.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handlePickupBlockedToggle(key)}
                              className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isBlocked
                                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                              }`}
                              title={isBlocked ? "Unblock this weekday (pickup available again)" : "Full block this weekday (no pickup)"}
                            >
                              {isBlocked ? "Unblock day" : "Block day"}
                            </button>
                          </div>
                        );
                      }
                    )}
                  </div>

                  {/* Desktop: table layout */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Day
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Start Time
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            End Time
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-700">
                            Block day
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"].map(
                          (label, idx) => {
                            const key = String(idx);
                            const window = pickupTimesConfig?.[key] || {
                              startTime: "12:00 PM",
                              endTime: "6:00 PM",
                            };
                            const isBlocked = !!window.blocked;
                            return (
                              <tr key={key} className={`border-b border-gray-100 ${isBlocked ? "bg-red-50" : ""}`}>
                                <td className="px-3 py-2 text-gray-800">{label}</td>
                                <td className="px-3 py-2">
                                  <select
                                    value={PICKUP_TIME_OPTIONS.includes(window.startTime) ? window.startTime : "12:00 PM"}
                                    onChange={(e) =>
                                      handlePickupTimeChange(key, "startTime", e.target.value)
                                    }
                                    disabled={isBlocked}
                                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-brown-500 focus:border-brown-500 disabled:bg-gray-100 disabled:text-gray-500"
                                  >
                                    {PICKUP_TIME_OPTIONS.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <select
                                    value={PICKUP_TIME_OPTIONS.includes(window.endTime) ? window.endTime : "6:00 PM"}
                                    onChange={(e) =>
                                      handlePickupTimeChange(key, "endTime", e.target.value)
                                    }
                                    disabled={isBlocked}
                                    className="w-28 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-brown-500 focus:border-brown-500 disabled:bg-gray-100 disabled:text-gray-500"
                                  >
                                    {PICKUP_TIME_OPTIONS.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </td>
                                <td className="px-3 py-2">
                                  <button
                                    type="button"
                                    onClick={() => handlePickupBlockedToggle(key)}
                                    className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                                      isBlocked
                                        ? "bg-green-100 text-green-800 hover:bg-green-200"
                                        : "bg-red-100 text-red-700 hover:bg-red-200"
                                    }`}
                                    title={isBlocked ? "Unblock this weekday (pickup available again)" : "Full block this weekday (no pickup)"}
                                  >
                                    {isBlocked ? "Unblock day" : "Block day"}
                                  </button>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleSavePickupTimes}
                      disabled={!pickupTimesConfig || pickupTimesSaving}
                      className="px-4 py-2 bg-brown-600 text-white rounded-lg text-sm font-medium hover:bg-brown-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {pickupTimesSaving ? "Saving..." : "Save Pickup Times"}
                    </button>
                    <span className="text-xs text-gray-500">
                      Options are every 30 minutes from 8:00 AM to 10:00 PM.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Gallery Tab */}
        {activeTab === "gallery" && (
          <>
            {galleryLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading gallery...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Add New Image Button */}
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Gallery Images</h2>
                  <button
                    onClick={() => {
                      setShowNewImageForm(!showNewImageForm);
                    }}
                    className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors"
                  >
                    {showNewImageForm ? "Cancel" : "+ Add New Image"}
                  </button>
                </div>

                {/* New Image Form */}
                {showNewImageForm && (
                  <div className="bg-white rounded-lg shadow-md p-6 border-2 border-brown-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Gallery Image</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Image URL *
                        </label>
                        <input
                          type="text"
                          value={newImage.url}
                          onChange={(e) =>
                            setNewImage({ ...newImage, url: e.target.value })
                          }
                          placeholder="https://example.com/image.jpg or /images/image.jpg"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Title (optional)
                        </label>
                        <input
                          type="text"
                          value={newImage.title}
                          onChange={(e) =>
                            setNewImage({ ...newImage, title: e.target.value })
                          }
                          placeholder="Image title"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (optional)
                        </label>
                        <textarea
                          value={newImage.description}
                          onChange={(e) =>
                            setNewImage({ ...newImage, description: e.target.value })
                          }
                          rows={3}
                          placeholder="Image description"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddGalleryImage}
                          disabled={deletingImages.has("new")}
                          className="px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors disabled:opacity-50"
                        >
                          {deletingImages.has("new") ? "Adding..." : "Add Image"}
                        </button>
                        <button
                          onClick={() => {
                            setShowNewImageForm(false);
                            setNewImage({ url: "", title: "", description: "" });
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gallery Images Grid */}
                {galleryImages.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-md p-8 text-center">
                    <p className="text-gray-600">No gallery images yet.</p>
                    <p className="text-sm text-gray-500 mt-2">
                      Add images to showcase your past orders and creations.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {galleryImages.map((image) => (
                      <div
                        key={image.id}
                        className="bg-white rounded-lg shadow-md overflow-hidden"
                      >
                        <div className="relative h-48 w-full bg-gray-200">
                          <Image
                            src={image.url}
                            alt={image.title || "Gallery image"}
                            fill
                            className="object-cover"
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            unoptimized
                          />
                        </div>
                        <div className="p-4">
                          {image.title && (
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {image.title}
                            </h3>
                          )}
                          {image.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {image.description}
                            </p>
                          )}
                          <button
                            onClick={() => handleDeleteGalleryImage(image.id)}
                            disabled={deletingImages.has(image.id)}
                            className="w-full px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 text-sm"
                          >
                            {deletingImages.has(image.id) ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Texts Tab */}
        {activeTab === "texts" && (
          <div className="max-w-4xl">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <p className="text-sm font-medium text-gray-600">Texts remaining</p>
              <p className="text-5xl font-bold text-gray-900 mt-1">
                {textTemplateLoading ? "…" : textsRemaining ?? "—"}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Text Template</h2>
              <p className="text-sm text-gray-600 mb-4">
                Message sent to customers via SMS. Use {"{time}"} and {"{address}"} for pickup time and address.
              </p>
              {textTemplateLoading ? (
                <p className="text-sm text-gray-600">Loading template...</p>
              ) : (
                <>
                  <label htmlFor="text-template" className="block text-sm font-medium text-gray-700 mb-1">
                    Template
                  </label>
                  <textarea
                    id="text-template"
                    value={textTemplate}
                    onChange={(e) => setTextTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={8}
                    placeholder="Enter the SMS message template..."
                  />
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={handleSaveTextTemplate}
                      disabled={textTemplateSaving || textTemplateTesting}
                      className="bg-brown-600 text-white px-4 py-2 rounded-lg hover:bg-brown-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {textTemplateSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={handleTestTextTemplate}
                      disabled={textTemplateTesting || textTemplateSaving}
                      className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {textTemplateTesting ? "Sending..." : "Test Text"}
                    </button>
                  </div>
                  <div className="mt-3">
                    <a
                      href="/api/cron/send-pickup-reminders"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Test Cron Job
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Updates Tab */}
        {activeTab === "updates" && (
          <>
            {updatesLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading updates...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Post a New Update</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                      <input
                        type="text"
                        value={newUpdate.version}
                        onChange={(e) => setNewUpdate((prev) => ({ ...prev, version: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., 1.2.0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                      <input
                        type="date"
                        value={newUpdate.date}
                        onChange={(e) => setNewUpdate((prev) => ({ ...prev, date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={handleAddUpdate}
                        disabled={savingUpdate}
                        className="w-full bg-brown-600 text-white px-4 py-2 rounded-lg hover:bg-brown-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {savingUpdate ? "Saving..." : "Add Update"}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newUpdate.description}
                      onChange={(e) => setNewUpdate((prev) => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={4}
                      placeholder="What changed?"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Recent Updates</h2>
                    <span className="text-sm text-gray-600">{updates.length} total</span>
                  </div>
                  {updates.length === 0 ? (
                    <p className="text-gray-600">No updates posted yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {updates.map((entry) => (
                        <div
                          key={entry.id}
                          className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-3 py-1 rounded-full bg-brown-100 text-brown-800 text-sm font-semibold">
                                v{entry.version}
                              </span>
                              <span className="text-sm text-gray-600">
                                {new Date(entry.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <p className="text-gray-800 whitespace-pre-line">{entry.description}</p>
                          </div>
                          <button
                            onClick={() => handleDeleteUpdate(entry.id)}
                            disabled={deletingUpdates.has(entry.id)}
                            className="self-start sm:self-auto px-3 py-2 text-sm font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deletingUpdates.has(entry.id) ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Customers Tab */}
        {activeTab === "customers" && (
          <>
            {ordersLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading customers...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className={selectedCustomer ? "lg:col-span-2" : "lg:col-span-3"}>
                  <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-200">
                      <h2 className="text-xl font-bold text-gray-900">Customers</h2>
                      <p className="text-sm text-gray-600">Click a row to view orders and update info. Primary key: phone number.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {customersList.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                                No customers yet. Customers appear after orders are placed.
                              </td>
                            </tr>
                          ) : (
                            customersList.map((c) => (
                              <tr
                                key={c.phoneKey}
                                onClick={() => setSelectedCustomerPhone(c.phoneKey)}
                                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                                  selectedCustomerPhone === c.phoneKey ? "bg-brown-50" : ""
                                }`}
                              >
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{c.name}</td>
                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{c.phone}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 truncate max-w-[200px]">{c.email || "—"}</td>
                                <td className="px-4 py-3 text-sm text-gray-700">{c.orderCount}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {selectedCustomer && (
                  <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-lg shadow-md p-4">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-lg font-bold text-gray-900">Customer detail</h3>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomerPhone(null)}
                          className="text-gray-500 hover:text-gray-700 text-sm"
                          aria-label="Close"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{selectedCustomer.name}</p>
                      <p className="text-sm text-gray-600">{selectedCustomer.phone}</p>
                      <p className="text-sm text-gray-600 truncate">{selectedCustomer.email || "No email"}</p>
                      <p className="text-xs text-gray-500 mt-1">{selectedCustomer.orderCount} order(s)</p>

                      {!editingCustomer ? (
                        <button
                          type="button"
                          onClick={() =>
                            setEditingCustomer({
                              name: selectedCustomer.name,
                              phone: selectedCustomer.phone,
                              email: selectedCustomer.email || "",
                            })
                          }
                          className="mt-3 w-full px-3 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 text-sm font-medium"
                        >
                          Update information
                        </button>
                      ) : (
                        <div className="mt-4 space-y-3 border-t pt-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                            <input
                              type="text"
                              value={editingCustomer.name}
                              onChange={(e) => setEditingCustomer((p) => (p ? { ...p, name: e.target.value } : null))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                            <input
                              type="tel"
                              value={editingCustomer.phone}
                              onChange={(e) => setEditingCustomer((p) => (p ? { ...p, phone: e.target.value } : null))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                            <input
                              type="email"
                              value={editingCustomer.email}
                              onChange={(e) => setEditingCustomer((p) => (p ? { ...p, email: e.target.value } : null))}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingCustomer(null)}
                              className="flex-1 px-2 py-1.5 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleUpdateCustomerInfo}
                              disabled={updatingCustomer}
                              className="flex-1 px-2 py-1.5 bg-brown-600 text-white rounded text-sm hover:bg-brown-700 disabled:opacity-50"
                            >
                              {updatingCustomer ? "Saving..." : "Save"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-lg shadow-md p-4">
                      <h3 className="text-lg font-bold text-gray-900 mb-3">Orders</h3>
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {selectedCustomer.orders.map((order) => (
                          <div
                            key={order.id}
                            className="border border-gray-200 rounded p-3 text-sm"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-semibold text-gray-900">#{order.id}</span>
                              <span className="text-gray-600">
                                {new Date(order.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                            </div>
                            <p className="text-gray-700 mt-1">${order.total.toFixed(2)}</p>
                            {order.completed && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800">Completed</span>
                            )}
                            {order.cancelled && (
                              <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs bg-red-100 text-red-800">Cancelled</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        <Footer />
      </main>
    </div>
  );
}

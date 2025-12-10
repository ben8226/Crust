"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { Order, Product } from "@/types/product";
import Link from "next/link";

type Tab = "orders" | "products" | "calendar" | "gallery";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>("orders");
  
  // Orders state
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "completed">("all");
  const [updatingOrders, setUpdatingOrders] = useState<Set<string>>(new Set());
  
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [updatingProducts, setUpdatingProducts] = useState<Set<string>>(new Set());
  const [deletingProducts, setDeletingProducts] = useState<Set<string>>(new Set());
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    description: "",
    price: 0,
    category: "",
    image: "",
    ingredients: "",
    inStock: true,
    isMiniLoafBox: false,
  });

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [togglingDates, setTogglingDates] = useState<Set<string>>(new Set());

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

  // Fetch products on mount - needed for displaying bread names in orders
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeTab === "orders") {
      fetchOrders();
    } else if (activeTab === "products") {
      fetchProducts();
    } else if (activeTab === "calendar") {
      fetchOrders();
      fetchBlockedDates();
    } else if (activeTab === "gallery") {
      fetchGalleryImages();
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
          isMiniLoafBox: editingProduct.isMiniLoafBox,
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
          isMiniLoafBox: newProduct.isMiniLoafBox ?? false,
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
    return date.toISOString().split("T")[0];
  };

  const getOrdersForDate = (date: Date) => {
    const dateStr = formatDateString(date);
    return orders.filter(
      (order) =>
        !order.completed &&
        order.pickupDate &&
        formatDateString(new Date(order.pickupDate)) === dateStr
    );
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

  const filteredOrders = orders.filter((order) => {
    if (filter === "pending") return !order.completed;
    if (filter === "completed") return order.completed;
    return true;
  });

  const pendingCount = orders.filter((o) => !o.completed).length;
  const completedCount = orders.filter((o) => o.completed).length;

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Manage orders, products, calendar, and gallery</p>
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
                <div className="mb-6 flex gap-2">
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
                              {order.completed ? (
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
                          <button
                            onClick={() => toggleOrderCompleted(order.id, order.completed || false)}
                            disabled={updatingOrders.has(order.id)}
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
                                {new Date(order.pickupDate).toLocaleDateString("en-US", {
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
                        </div>

                        <div className="border-t pt-4">
                          <p className="text-sm font-medium text-gray-600 mb-2">Items</p>
                          <div className="space-y-2">
                            {order.items.map((item, index) => (
                              <div key={index} className="text-sm text-gray-700">
                                <div className="flex justify-between">
                                  <span>
                                    {item.product.name} × {item.quantity}
                                  </span>
                                  <span>
                                    ${(item.product.price * item.quantity).toFixed(2)}
                                  </span>
                                </div>
                                {item.product.isMiniLoafBox && item.selectedBreads && item.selectedBreads.length > 0 && (
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

                        {order.completed && order.completedDate && (
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
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">Products</h2>
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
                              checked={newProduct.isMiniLoafBox ?? false}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  isMiniLoafBox: e.target.checked,
                                })
                              }
                              className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                            />
                            <span className="text-sm font-medium text-gray-700">
                              Mini Loaf Box (requires bread selection)
                            </span>
                          </label>
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
                              isMiniLoafBox: false,
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
                                checked={editingProduct.isMiniLoafBox ?? false}
                                onChange={(e) =>
                                  setEditingProduct({
                                    ...editingProduct,
                                    isMiniLoafBox: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 text-brown-600 focus:ring-brown-500 border-gray-300 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                Mini Loaf Box (requires bread selection)
                              </span>
                            </label>
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
                    const isBlocked = blockedDates.includes(dateStr);
                    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
                    const isToday =
                      formatDateString(date) === formatDateString(new Date());
                    const ordersForDate = getOrdersForDate(date);
                    const canBlock = !isPast;

                    return (
                      <div
                        key={dateStr}
                        className={`min-h-24 border rounded-lg p-2 ${
                          isToday
                            ? "bg-brown-50 border-brown-300"
                            : isBlocked
                            ? "bg-red-50 border-red-300"
                            : "bg-gray-50 border-gray-200"
                        } ${isPast ? "opacity-50" : ""}`}
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
                          </span>
                          {canBlock && (
                            <button
                              onClick={() => toggleBlockedDate(dateStr)}
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
                          <img
                            src={image.url}
                            alt={image.title || "Gallery image"}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder-image.png";
                            }}
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
      </main>
    </div>
  );
}

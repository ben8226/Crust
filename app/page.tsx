import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getProducts, getProductDisplayConfig } from "@/lib/db";
import { getBlockedDates, getPickupTimes, getPickupWindowDates } from "@/lib/db";
import { formatDateInput } from "@/lib/date";
import { products as staticProducts } from "@/data/products";
import { Product } from "@/types/product";

async function fetchProducts() {
  try {
    // Get products from database
    let products = await getProducts();

    // If no products in database, use static products as fallback
    if (products.length === 0) {
      products = staticProducts;
    }

    return products;
  } catch (error) {
    console.error("Error fetching products:", error);
    // Fallback to static products if anything fails
    return staticProducts;
  }
}

async function getNextAvailablePickup() {
  try {
    const [blockedDates, pickupTimesConfig, pickupWindowDates] = await Promise.all([
      getBlockedDates(),
      getPickupTimes(),
      getPickupWindowDates(),
    ]);

    // Start from 2 days from today (minimum advance notice)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 2);
    startDate.setHours(0, 0, 0, 0);

    // Check up to 30 days in advance
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(startDate.getDate() + i);

      // Format date the same way blocked dates are stored
      const checkDateString = formatDateInput(checkDate);

      // Skip if date is blocked
      if (blockedDates.includes(checkDateString)) continue;
      if (pickupWindowDates[checkDateString]?.blocked) continue;

      const dayOfWeek = checkDate.getDay(); // 0-6
      const dateOverride = pickupWindowDates[checkDateString];
      const weekdayWindow = pickupTimesConfig[String(dayOfWeek)];
      const windowForDay = dateOverride ?? weekdayWindow;
      if (windowForDay?.blocked) continue; // no pickup on this weekday
      const earliestTime = windowForDay?.startTime || "12:00 PM";

      return {
        date: checkDate,
        time: earliestTime
      };
    }

    // Fallback if no dates available (shouldn't happen)
    return null;
  } catch (error) {
    console.error("Error calculating next available pickup:", error);
    return null;
  }
}

// Group products by category and sort (uses admin display config when available)
function organizeProducts(
  products: Product[],
  displayConfig?: { categoryOrder?: string[]; productOrderByCategory?: Record<string, string[]> }
) {
  const categoryPriority: Record<string, number> = {
    "Sourdough Bread": 0,
    "Bread": 0,
    "Breads": 0,
  };

  const grouped = products.reduce((acc, product) => {
    const category = product.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  const categoryNames = Object.keys(grouped);

  // Sort categories: use admin config if present, else default (Bread first, then alpha)
  let sortedCategories: string[];
  if (displayConfig?.categoryOrder?.length) {
    const orderSet = new Set(displayConfig.categoryOrder);
    const ordered = displayConfig.categoryOrder.filter((c) => grouped[c]);
    const rest = categoryNames.filter((c) => !orderSet.has(c)).sort((a, b) => a.localeCompare(b));
    sortedCategories = [...ordered, ...rest];
  } else {
    sortedCategories = categoryNames.sort((a, b) => {
      const pa = categoryPriority[a] ?? 999;
      const pb = categoryPriority[b] ?? 999;
      if (pa !== pb) return pa - pb;
      return a.localeCompare(b);
    });
  }

  // Sort products within each category: use admin config if present, else by price
  const productOrder = displayConfig?.productOrderByCategory;
  sortedCategories.forEach((category) => {
    const items = grouped[category];
    if (productOrder?.[category]?.length) {
      const orderMap = new Map(productOrder[category].map((id, i) => [id, i]));
      items.sort((a, b) => {
        const ia = orderMap.get(a.id) ?? 9999;
        const ib = orderMap.get(b.id) ?? 9999;
        if (ia !== ib) return ia - ib;
        return a.price - b.price;
      });
    } else {
      items.sort((a, b) => a.price - b.price);
    }
  });

  return { grouped, sortedCategories };
}

export default async function Home() {
  const [allProducts, displayConfig] = await Promise.all([
    fetchProducts(),
    getProductDisplayConfig(),
  ]);
  const products = allProducts.filter((p) => !p.hiddenFromMenu);
  const { grouped, sortedCategories } = organizeProducts(products, displayConfig);
  const nextPickup = await getNextAvailablePickup();

  // Get available breads for loaf boxes (only Sourdough Bread category, exclude the box itself and limited-time items)
  const availableBreads = products.filter(
    (p) => p.category === "Sourdough Bread" && p.loafType !== 'mini' && p.loafType !== 'half' && p.inStock && !p.limitedTime
  );

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      {nextPickup && (
        <div className="bg-brown-600 text-white py-3">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-sm sm:text-base font-medium">
              🚚 Next available pickup: {nextPickup.date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric"
              })} at {nextPickup.time}
            </p>
          </div>
        </div>
      )}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No products available at the moment.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {sortedCategories.map((category) => (
              <div key={category}>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 border-b-2 border-brown-600 pb-2">
                  {category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
                  {grouped[category].map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      availableBreads={availableBreads}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <Footer />
      </main>
    </div>
  );
}


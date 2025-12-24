import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/db";
import { getBlockedDates } from "@/lib/db";
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
    const blockedDates = await getBlockedDates();

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
      if (blockedDates.includes(checkDateString)) {
        continue;
      }

      const dayOfWeek = checkDate.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday

      // Earliest time based on weekday/weekend
      const earliestTime = isWeekend ? "12:00 PM" : "10:00 AM";

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

// Group products by category and sort
function organizeProducts(products: Product[]) {
  // Define category priority (Sourdough Bread first, then others alphabetically)
  const categoryPriority: Record<string, number> = {
    "Sourdough Bread": 0,
    "Bread": 0, // Legacy support
    "Breads": 0, // Handle plural variations
  };

  // Group products by category
  const grouped = products.reduce((acc, product) => {
    const category = product.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(product);
    return acc;
  }, {} as Record<string, Product[]>);

  // Sort products within each category by price
  Object.keys(grouped).forEach((category) => {
    grouped[category].sort((a, b) => a.price - b.price);
  });

  // Sort categories: Bread first, then others alphabetically
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const priorityA = categoryPriority[a] ?? 999;
    const priorityB = categoryPriority[b] ?? 999;
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    return a.localeCompare(b);
  });

  return { grouped, sortedCategories };
}

export default async function Home() {
  const products = await fetchProducts();
  const { grouped, sortedCategories } = organizeProducts(products);
  const nextPickup = await getNextAvailablePickup();

  // Get available breads for loaf boxes (all bread products except the box itself)
  const availableBreads = products.filter(
    (p) => p.category?.toLowerCase().includes("bread") && p.loafType !== 'mini' && p.loafType !== 'half' && p.inStock
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
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
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


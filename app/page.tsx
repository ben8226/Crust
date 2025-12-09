import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/db";
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

// Group products by category and sort
function organizeProducts(products: Product[]) {
  // Define category priority (Bread first, then others alphabetically)
  const categoryPriority: Record<string, number> = {
    "Bread": 0,
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
  
  // Get available breads for mini loaf box (all bread products except the box itself)
  const availableBreads = products.filter(
    (p) => p.category === "Bread" && !p.isMiniLoafBox && p.inStock
  );

  return (
    <div className="min-h-screen bg-tan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            Sourdough Bread
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            These products are homemade and not subject to state inspection.  Minnesota Cottage Food Producer License #20273109
          </p>
        </div>
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
      </main>
    </div>
  );
}


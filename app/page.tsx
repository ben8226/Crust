import Navbar from "@/components/Navbar";
import ProductCard from "@/components/ProductCard";
import { getProducts } from "@/lib/db";
import { products as staticProducts } from "@/data/products";

async function fetchProducts() {
  try {
    // Try to get products from database/file
    let products = getProducts();
    
    // If no products in database, use static products
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

export default async function Home() {
  const products = await fetchProducts();

  return (
    <div className="min-h-screen bg-tan-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Sourdough Bread
          </h1>
          <p className="text-gray-600">
            These products are homemade and not subject to state inspection.  Minnesota Cottage Food Producer License #20273109
          </p>
        </div>
        {products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600">No products available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}


import { NextResponse } from "next/server";
import { getProducts, saveProducts, saveProduct } from "@/lib/db";
import { products as staticProducts } from "@/data/products";
import { Product } from "@/types/product";

export async function GET() {
  try {
    // Get products from database
    let products = await getProducts();
    
    // If no products in database, initialize with static products
    if (products.length === 0) {
      console.log("No products in database, initializing with static products");
      products = staticProducts;
      try {
        await saveProducts(staticProducts);
        console.log("✓ Static products migrated to database");
      } catch (saveError) {
        console.error("Failed to save static products to database:", saveError);
        // Still return the products even if save failed
      }
    }

    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const product: Product = await request.json();

    // Validate required fields
    if (!product.name || !product.price || !product.category) {
      return NextResponse.json(
        { error: "Missing required fields: name, price, category" },
        { status: 400 }
      );
    }

    // Generate ID if not provided
    if (!product.id) {
      product.id = `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Set defaults
    if (product.inStock === undefined) {
      product.inStock = true;
    }

    await saveProduct(product);

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}



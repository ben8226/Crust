import { NextResponse } from "next/server";
import { getProducts } from "@/lib/db";
import { products as staticProducts } from "@/data/products";

export async function GET() {
  try {
    // Try to get products from database/file
    let products = getProducts();
    
    // If no products in database, use static products
    if (products.length === 0) {
      products = staticProducts;
      // Optionally save static products to database
      // saveProducts(staticProducts);
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



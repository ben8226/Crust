import { NextResponse } from "next/server";
import { getProducts } from "@/lib/db";
import { products as staticProducts } from "@/data/products";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    let products = getProducts();
    
    if (products.length === 0) {
      products = staticProducts;
    }

    const product = products.find((p) => p.id === params.id);

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(product, { status: 200 });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}



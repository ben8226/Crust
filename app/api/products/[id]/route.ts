import { NextResponse } from "next/server";
import { getProducts, updateProduct, deleteProduct } from "@/lib/db";
import { Product } from "@/types/product";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const products = await getProducts();
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates: Partial<Product> = {};

    // Allow updating any product field
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.price !== undefined) updates.price = body.price;
    if (body.image !== undefined) updates.image = body.image;
    if (body.category !== undefined) updates.category = body.category;
    if (body.ingredients !== undefined) updates.ingredients = body.ingredients;
    if (body.inStock !== undefined) updates.inStock = body.inStock;
    if (body.isMiniLoafBox !== undefined) updates.isMiniLoafBox = body.isMiniLoafBox;
    if (body.allergens !== undefined) updates.allergens = body.allergens;

    const updatedProduct = await updateProduct(params.id, updates);

    if (!updatedProduct) {
      return NextResponse.json(
        { error: "Product not found or update failed" },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedProduct, { status: 200 });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deleted = await deleteProduct(params.id);

    if (!deleted) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}

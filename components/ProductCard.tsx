"use client";

import { Product } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import Image from "next/image";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow">
      <div className="relative h-48 w-full bg-gray-200">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        {!product.inStock && (
          <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-sm font-semibold">
            Out of Stock
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{product.name}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-brown-600">
            ${product.price.toFixed(2)}
          </span>
          <button
            onClick={() => addToCart(product)}
            disabled={!product.inStock}
            className={`px-4 py-2 rounded font-medium transition-colors ${
              product.inStock
                ? "bg-brown-600 text-white hover:bg-brown-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Add to Cart
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">{product.category}</p>
      </div>
    </div>
  );
}



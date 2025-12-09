"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types/product";
import { useCart } from "@/contexts/CartContext";
import Image from "next/image";
import MiniLoafBoxModal from "./MiniLoafBoxModal";

interface ProductCardProps {
  product: Product;
  availableBreads?: Product[]; // For mini loaf box selection
}

export default function ProductCard({ product, availableBreads = [] }: ProductCardProps) {
  const { addToCart } = useCart();
  const [showModal, setShowModal] = useState(false);

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
            onClick={() => {
              if (product.isMiniLoafBox) {
                setShowModal(true);
              } else {
                addToCart(product);
              }
            }}
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
        {product.ingredients && (
          <p className="text-xs text-gray-600 mt-3 pt-3 border-t border-gray-200">
            <span className="font-medium text-gray-700">Ingredients: </span>
            {product.ingredients}
          </p>
        )}
      </div>

      {product.isMiniLoafBox && (
        <MiniLoafBoxModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onConfirm={(selectedBreads) => {
            addToCart(product, selectedBreads);
          }}
          availableBreads={availableBreads}
        />
      )}
    </div>
  );
}



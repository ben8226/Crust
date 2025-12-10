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
      <div className="relative w-full aspect-square bg-gray-200">
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="text-xl sm:text-2xl font-bold text-brown-600">
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
            className={`w-full sm:w-auto px-4 py-2 rounded font-medium transition-colors text-sm sm:text-base ${
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
        {product.allergens && (product.allergens.wheat || product.allergens.dairy || product.allergens.egg) && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="text-xs font-medium text-gray-700">Contains: </span>
            {product.allergens.wheat && (
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Wheat</span>
            )}
            {product.allergens.dairy && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Dairy</span>
            )}
            {product.allergens.egg && (
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">Egg</span>
            )}
          </div>
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



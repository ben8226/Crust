"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";

export default function Navbar() {
  const { getTotalItems } = useCart();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2 sm:gap-3">
            <Image
              src="/images/LOGO.png"
              alt="Crust + Culture Microbakery"
              width={40}
              height={40}
              className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 object-contain"
              priority
            />
            <span className="hidden sm:inline text-lg sm:text-xl md:text-2xl font-bold text-brown-600">
              Crust + Culture Microbakery
            </span>
          </Link>
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4 lg:space-x-6">
            <Link
              href="/"
              className="text-gray-700 hover:text-brown-600 transition-colors text-sm lg:text-base"
            >
              Products
            </Link>
            <Link
              href="/about"
              className="text-gray-700 hover:text-brown-600 transition-colors text-sm lg:text-base"
            >
              About Us
            </Link>
            <Link
              href="/gallery"
              className="text-gray-700 hover:text-brown-600 transition-colors text-sm lg:text-base"
            >
              Gallery
            </Link>
            <Link
              href="/cart"
              className="relative text-gray-700 hover:text-brown-600 transition-colors text-sm lg:text-base"
            >
              Cart
              {getTotalItems() > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>
            <Link
              href="/admin"
              className="text-gray-700 hover:text-brown-600 transition-colors text-sm lg:text-base"
            >
              Admin
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-3">
            <Link
              href="/cart"
              className="relative text-gray-700 hover:text-brown-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {getTotalItems() > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {getTotalItems()}
                </span>
              )}
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-brown-600 transition-colors"
              aria-label="Toggle menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4 space-y-3">
            <Link
              href="/"
              onClick={() => setIsMenuOpen(false)}
              className="block text-gray-700 hover:text-brown-600 transition-colors py-2"
            >
              Products
            </Link>
            <Link
              href="/about"
              onClick={() => setIsMenuOpen(false)}
              className="block text-gray-700 hover:text-brown-600 transition-colors py-2"
            >
              About Us
            </Link>
            <Link
              href="/gallery"
              onClick={() => setIsMenuOpen(false)}
              className="block text-gray-700 hover:text-brown-600 transition-colors py-2"
            >
              Gallery
            </Link>
            <Link
              href="/admin"
              onClick={() => setIsMenuOpen(false)}
              className="block text-gray-700 hover:text-brown-600 transition-colors py-2"
            >
              Admin
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}


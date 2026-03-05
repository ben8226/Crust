"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

// Static gallery images from public/images/Gallery folder
const galleryImages = [
  "/images/Gallery/IMG_6456.JPEG",
  "/images/Gallery/IMG_6468.JPEG",
  "/images/Gallery/IMG_6471.JPEG",
  "/images/Gallery/IMG_6540.JPEG",
  "/images/Gallery/IMG_6562.JPEG",
  "/images/Gallery/IMG_6582.JPEG",
  "/images/Gallery/IMG_6598.JPEG",
  "/images/Gallery/IMG_6651.JPEG",
  "/images/Gallery/IMG_6727.JPEG",
  "/images/Gallery/IMG_6732.JPEG",
  "/images/Gallery/IMG_6744.JPEG",
  "/images/Gallery/IMG_6787.JPEG",
  "/images/Gallery/IMG_6801.JPEG",
  "/images/Gallery/IMG_6820.JPEG",
  "/images/Gallery/IMG_6824.JPEG",
  "/images/Gallery/IMG_6874.JPEG",
  "/images/Gallery/IMG_6887.JPEG",
  "/images/Gallery/IMG_6890.JPEG",
  "/images/Gallery/IMG_6934.JPEG",
  "/images/Gallery/IMG_6948.JPEG",
  "/images/Gallery/IMG_7047.JPEG",
];



export default function GalleryPage() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gallery</h1>
          <p className="text-gray-600">
            Browse images of our past orders and creations
          </p>
        </div>

        {/* Masonry/Collage Grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {galleryImages.map((image, index) => (
            <div
              key={index}
              className="break-inside-avoid relative group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
              onClick={() => setSelectedImage(image)}
            >
              <div className="relative">
                <Image
                  src={image}
                  alt={`Gallery image ${index + 1}`}
                  width={400}
                  height={index % 3 === 0 ? 600 : index % 2 === 0 ? 400 : 500}
                  className="w-full h-auto object-cover"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300" />
              </div>
            </div>
          ))}
        </div>

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="max-w-5xl w-full max-h-[90vh] relative"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full h-[85vh]">
                <Image
                  src={selectedImage}
                  alt="Gallery image"
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 transition-colors"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6 text-gray-900"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
        <Footer />
      </main>
    </div>
  );
}


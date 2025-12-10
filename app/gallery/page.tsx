"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Image from "next/image";

interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  description?: string;
  date?: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch gallery images from API
    const fetchImages = async () => {
      try {
        const response = await fetch("/api/gallery");
        if (response.ok) {
          const data = await response.json();
          setImages(data);
        }
      } catch (error) {
        console.error("Error fetching gallery images:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchImages();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-tan-200">
        <Navbar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <p className="text-gray-600">Loading gallery...</p>
          </div>
        </main>
      </div>
    );
  }

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

        {images.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-gray-600 mb-4">No gallery images yet.</p>
            <p className="text-sm text-gray-500">
              Images will appear here once they&apos;re added to the gallery.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedImage(image)}
              >
                <div className="relative h-64 w-full bg-gray-200">
                  <Image
                    src={image.url}
                    alt={image.title || "Gallery image"}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                {(image.title || image.description) && (
                  <div className="p-4">
                    {image.title && (
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {image.title}
                      </h3>
                    )}
                    {image.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {image.description}
                      </p>
                    )}
                    {image.date && (
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(image.date).toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Image Modal */}
        {selectedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="max-w-4xl w-full bg-white rounded-lg overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative h-[70vh] w-full bg-gray-200">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.title || "Gallery image"}
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
              {(selectedImage.title || selectedImage.description) && (
                <div className="p-6">
                  {selectedImage.title && (
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedImage.title}
                    </h2>
                  )}
                  {selectedImage.description && (
                    <p className="text-gray-700 mb-2">
                      {selectedImage.description}
                    </p>
                  )}
                  {selectedImage.date && (
                    <p className="text-sm text-gray-500">
                      {new Date(selectedImage.date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              )}
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


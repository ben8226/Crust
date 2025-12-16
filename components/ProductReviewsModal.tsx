"use client";

import { useEffect, useState } from "react";

interface ReviewEntry {
  review: string;
  productId: string;
  productName: string;
  orderId: string;
  orderDate: string;
  pickupDate?: string;
  pickupTime?: string;
}

interface ProductReviewsModalProps {
  productId: string;
  productName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductReviewsModal({
  productId,
  productName,
  isOpen,
  onClose,
}: ProductReviewsModalProps) {
  const [reviews, setReviews] = useState<ReviewEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReviews = async () => {
      if (!isOpen) return;
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/reviews/${productId}`);
        if (res.ok) {
          const data: ReviewEntry[] = await res.json();
          setReviews(data);
        } else {
          setError("Failed to load reviews.");
        }
      } catch (err) {
        console.error("Error loading reviews", err);
        setError("Failed to load reviews.");
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, [isOpen, productId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{productName} Reviews</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close reviews"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading && <p className="text-gray-600 text-sm">Loading reviews...</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {!loading && !error && reviews.length === 0 && (
            <p className="text-gray-600 text-sm">No reviews yet for this product.</p>
          )}
          {!loading &&
            !error &&
            reviews.map((review) => (
              <div
                key={`${review.orderId}-${review.productId}-${review.review.slice(0, 8)}`}
                className="border border-gray-200 rounded-lg p-3"
              >
                <p className="text-gray-800 text-sm whitespace-pre-line">{review.review}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

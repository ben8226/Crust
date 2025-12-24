"use client";

import { useState, useEffect } from "react";
import { Product } from "@/types/product";

interface MiniLoafBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedBreads: string[]) => void;
  availableBreads: Product[];
  selectionCount?: number; // Number of breads to select (default: 4 for mini loaf)
  boxType?: 'mini' | 'half'; // Type of loaf box
}

export default function MiniLoafBoxModal({
  isOpen,
  onClose,
  onConfirm,
  availableBreads,
  selectionCount = 4,
  boxType = 'mini',
}: MiniLoafBoxModalProps) {
  const [selectedBreads, setSelectedBreads] = useState<string[]>(Array(selectionCount).fill(""));

  useEffect(() => {
    if (isOpen) {
      // Reset selections when modal opens
      setSelectedBreads(Array(selectionCount).fill(""));
    }
  }, [isOpen, selectionCount]);

  const handleBreadChange = (index: number, breadId: string) => {
    const newSelections = [...selectedBreads];
    newSelections[index] = breadId;
    setSelectedBreads(newSelections);
  };

  const handleConfirm = () => {
    // Validate that all breads are selected
    if (selectedBreads.some((id) => !id)) {
      alert(`Please select ${selectionCount} ${selectionCount === 1 ? 'bread' : 'breads'} for the box`);
      return;
    }

    onConfirm(selectedBreads);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            Select {selectionCount} Bread{selectionCount === 1 ? '' : 's'} for Your {boxType === 'half' ? 'Half Loaf' : 'Mini Loaf'} Box
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-6 h-6"
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

        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
          {Array.from({ length: selectionCount }, (_, index) => (
            <div key={index}>
              <label className="block text-sm font-medium text-gray-700 mb-1 sm:mb-2">
                Bread {index + 1} *
              </label>
              <select
                value={selectedBreads[index]}
                onChange={(e) => handleBreadChange(index, e.target.value)}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-brown-500 focus:border-transparent"
              >
                <option value="">Select a bread...</option>
                {availableBreads.map((bread) => (
                  <option key={bread.id} value={bread.id}>
                    {bread.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm sm:text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="w-full sm:w-auto px-4 py-2 bg-brown-600 text-white rounded-lg hover:bg-brown-700 transition-colors text-sm sm:text-base"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}


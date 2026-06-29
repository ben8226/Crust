"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface SpecialEventPopupProps {
  eventDate: string;
  titleDateLabel: string;
  availabilityLines: string[];
}

function getDismissKey(eventDate: string) {
  return `specialEventPopupDismissed-${eventDate}`;
}

export default function SpecialEventPopup({
  eventDate,
  titleDateLabel,
  availabilityLines,
}: SpecialEventPopupProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(getDismissKey(eventDate));
    if (!dismissed) {
      setIsOpen(true);
    }
  }, [eventDate]);

  const handleClose = () => {
    localStorage.setItem(getDismissKey(eventDate), "1");
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, eventDate]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="special-event-popup-title"
    >
      <div
        className="bg-amber-500 text-white rounded-lg shadow-xl max-w-lg w-full p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end -mt-1 -mr-1 mb-2">
          <button
            type="button"
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="text-center">
          <p id="special-event-popup-title" className="text-lg sm:text-xl font-semibold">
            Special Event Today, {titleDateLabel}!
          </p>

          {availabilityLines.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm sm:text-base">
              {availabilityLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}

          <Link
            href="/special-event"
            onClick={handleClose}
            className="inline-block mt-6 bg-white text-amber-700 font-semibold px-5 py-2.5 rounded-lg hover:bg-amber-50 transition-colors text-sm sm:text-base"
          >
            Order for Today&apos;s Event
          </Link>
        </div>
      </div>
    </div>
  );
}

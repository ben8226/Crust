"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function Footer() {
  const [latestVersion, setLatestVersion] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const res = await fetch("/api/updates");
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setLatestVersion(data[0].version);
        }
      } catch (error) {
        console.error("Error fetching latest version", error);
      }
    };
    fetchLatest();
  }, []);

  return (
    <div className="mt-12 pt-8 border-t border-gray-300">
      <p className="text-sm sm:text-base text-gray-600 text-center">
        These products are homemade and not subject to state inspection. Minnesota Cottage Food Producer License #20273109
      </p>
      <p className="mt-2 text-xs sm:text-sm text-gray-500 text-center">
        Disclaimer: This is a home bakery. Products may be subject to cross-contamination. We are not allergy-friendly.
      </p>
      <div className="mt-2 text-sm text-center">
        <Link
          href="/updates"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {latestVersion ? `Website version ${latestVersion}` : "Website updates"}
        </Link>
      </div>
    </div>
  );
}

"use client";

import Navbar from "@/components/Navbar";
import InstagramEmbed from "@/components/InstagramEmbed";

export default function InstagramPage() {
  // Replace with your actual Instagram post URL or profile
  const instagramPostUrl = "https://www.instagram.com/p/example/";
  const instagramProfileUrl = "https://www.instagram.com/YOUR_USERNAME/";

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Follow Us on Instagram
          </h1>
          <p className="text-gray-600">
            Check out our latest posts and updates
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Latest Posts
          </h2>
          <p className="text-gray-600 mb-4">
            Visit our{" "}
            <a
              href={instagramProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brown-600 hover:text-brown-700 underline"
            >
              Instagram profile
            </a>{" "}
            to see all our posts.
          </p>
          
          {/* Example: Embed a specific Instagram post */}
          {/* Uncomment and replace with your actual post URL */}
          {/* <InstagramEmbed url={instagramPostUrl} /> */}
        </div>

        {/* Alternative: Instagram Profile Embed using iframe */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Instagram Feed
          </h2>
          <div className="flex justify-center">
            <iframe
              src={`https://www.instagram.com/crustandculturemicrobakery/embed`}
              width="400"
              height="500"
              frameBorder="0"
              scrolling="no"
              allowTransparency
              className="rounded-lg"
            />
          </div>
          <p className="text-sm text-gray-500 mt-4 text-center">
            Note: Replace &quot;yourusername&quot; with your actual Instagram username
          </p>
        </div>
      </main>
    </div>
  );
}


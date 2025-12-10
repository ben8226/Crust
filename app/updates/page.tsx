import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getUpdates } from "@/lib/db";

export const revalidate = 60; // cache briefly

export default async function UpdatesPage() {
  const updates = await getUpdates();
  const sorted = [...updates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Website Updates</h1>
        <p className="text-gray-700 mb-6">
          Recent changes and release notes for the site.
        </p>

        {sorted.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-gray-600">No updates have been posted yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sorted.map((entry) => (
              <div
                key={entry.id}
                className="bg-white rounded-lg shadow p-5 border border-gray-100"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-brown-100 text-brown-800 text-sm font-semibold">
                      v{entry.version}
                    </span>
                    <span className="text-sm text-gray-600">
                      {new Date(entry.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-gray-800 whitespace-pre-line">{entry.description}</p>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}


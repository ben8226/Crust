import Navbar from "@/components/Navbar";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-tan-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About Us</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 mb-6">
              Welcome to Crust + Culture Microbakery! We are passionate about creating 
              artisanal sourdough bread and bakery items using traditional methods and 
              high-quality ingredients.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Story</h2>
            <p className="text-gray-700 mb-4">
              At Crust + Culture, we believe in the art of slow fermentation and 
              the beauty of handcrafted bread. Each loaf is carefully made with 
              attention to detail, using time-honored techniques that bring out 
              the best flavors and textures.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Our Mission</h2>
            <p className="text-gray-700 mb-4">
              Our mission is to provide our community with delicious, wholesome 
              baked goods made with care and the finest ingredients. We take pride 
              in offering a variety of flavors and styles to suit every taste.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Cottage Food Producer</h2>
            <p className="text-gray-700 mb-4">
              These products are homemade and not subject to state inspection. 
              Minnesota Cottage Food Producer License #20273109
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Contact Us</h2>
            <p className="text-gray-700">
              Have questions or want to place a custom order? We&apos;d love to hear from you! 
              Please reach out through our order system or contact us directly.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}


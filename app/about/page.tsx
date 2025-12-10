import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-tan-200">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-lg shadow-md p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">About Us</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-lg text-gray-700 mb-6">
            Hi!
            <br />
            <br />
            My name is Amanda and I am the baker and owner of Crust + Culture!
            I started this microbakery out of my home back in 2024 when I officially got a Minnesota Cottage Food license. 
            I have been baking sourdough bread since 2023. I specialize in small, made to order batches. 
            I am not a huge bakery that produces 50+ sourdough loaves in one day. 
            That is what sets me apart, I put extra care and thought into every single loaf since I&apos;m able to focus on small qualities at once.
            I have been adding and removing inclusion loaves from my menu to make sure the best and most perfected loaves are on the menu.
            If you have any inclusion loaf ideas make sure to send me a DM on Instagram to see if I can make it happen.
            <br />
            <br />
            I love being able to share my skills of sourdough with the Crystal community. 
            Whether it&apos;s a big get together, or sharing a slice with a friend, I would love to be a part of your dinner table.
            </p>


          </div>
          
        </div>
        <Footer />
      </main>
    </div>
  );
}


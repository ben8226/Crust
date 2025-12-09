import { NextResponse } from "next/server";
import { getGalleryImages, saveGalleryImage, GalleryImage } from "@/lib/db";

export async function GET() {
  try {
    const images = await getGalleryImages();
    return NextResponse.json(images, { status: 200 });
  } catch (error) {
    console.error("Error fetching gallery images:", error);
    return NextResponse.json(
      { error: "Failed to fetch gallery images" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.url) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    const image: GalleryImage = {
      id: `IMG-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: body.url,
      title: body.title,
      description: body.description,
      date: body.date || new Date().toISOString(),
    };

    await saveGalleryImage(image);

    return NextResponse.json(image, { status: 201 });
  } catch (error) {
    console.error("Error creating gallery image:", error);
    return NextResponse.json(
      { error: "Failed to create gallery image" },
      { status: 500 }
    );
  }
}


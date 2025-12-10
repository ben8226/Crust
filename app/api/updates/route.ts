import { NextResponse } from "next/server";
import { addUpdate, getUpdates } from "@/lib/db";

export async function GET() {
  try {
    const updates = await getUpdates();
    return NextResponse.json(updates, { status: 200 });
  } catch (error) {
    console.error("Error fetching updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch updates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { version, description, date } = body || {};

    if (!version || !description || !date) {
      return NextResponse.json(
        { error: "version, description, and date are required" },
        { status: 400 }
      );
    }

    const newUpdate = await addUpdate({
      version: String(version),
      description: String(description),
      date: String(date),
    });

    return NextResponse.json(newUpdate, { status: 201 });
  } catch (error) {
    console.error("Error creating update:", error);
    return NextResponse.json(
      { error: "Failed to create update" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { getTexts } from "@/lib/db";

export async function GET() {
  try {
    const entries = await getTexts();
    return NextResponse.json(entries, { status: 200 });
  } catch (error) {
    console.error("Error fetching texts log:", error);
    return NextResponse.json({ error: "Failed to fetch texts log" }, { status: 500 });
  }
}

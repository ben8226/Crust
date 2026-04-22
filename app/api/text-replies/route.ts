import { NextResponse } from "next/server";
import { getTextReplies } from "@/lib/db";

export async function GET() {
  try {
    const entries = await getTextReplies();
    return NextResponse.json(entries, { status: 200 });
  } catch (error) {
    console.error("Error fetching text replies:", error);
    return NextResponse.json({ error: "Failed to fetch text replies" }, { status: 500 });
  }
}

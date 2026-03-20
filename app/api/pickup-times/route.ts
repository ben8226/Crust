import { NextResponse } from "next/server";
import { getPickupTimes, setPickupTimes, PickupTimesConfig } from "@/lib/db";

export async function GET() {
  try {
    const config = await getPickupTimes();
    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error("Error fetching pickup times:", error);
    return NextResponse.json(
      { error: "Failed to fetch pickup times" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = body?.pickupTimes as PickupTimesConfig | undefined;

    if (!config || typeof config !== "object") {
      return NextResponse.json(
        { error: "Invalid payload. Provide a 'pickupTimes' object." },
        { status: 400 }
      );
    }

    await setPickupTimes(config);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating pickup times:", error);
    return NextResponse.json(
      { error: "Failed to update pickup times" },
      { status: 500 }
    );
  }
}


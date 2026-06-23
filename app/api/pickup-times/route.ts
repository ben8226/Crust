import { NextResponse } from "next/server";
import {
  getPickupTimes,
  setPickupTimes,
  getCutEarliestPickupTime,
  setCutEarliestPickupTime,
  PickupTimesConfig,
} from "@/lib/db";

export async function GET() {
  try {
    const [pickupTimes, cutEarliestPickupTime] = await Promise.all([
      getPickupTimes(),
      getCutEarliestPickupTime(),
    ]);
    return NextResponse.json({ pickupTimes, cutEarliestPickupTime }, { status: 200 });
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

    if (typeof body?.cutEarliestPickupTime === "string" && body.cutEarliestPickupTime.trim()) {
      await setCutEarliestPickupTime(body.cutEarliestPickupTime.trim());
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating pickup times:", error);
    return NextResponse.json(
      { error: "Failed to update pickup times" },
      { status: 500 }
    );
  }
}

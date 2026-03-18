import { NextResponse } from "next/server";
import {
  getPickupWindowDates,
  setPickupWindowForDate,
  removePickupWindowForDate,
  PickupTimeWindow,
} from "@/lib/db";

export async function GET() {
  try {
    const dates = await getPickupWindowDates();
    return NextResponse.json(dates, { status: 200 });
  } catch (error) {
    console.error("Error fetching pickup window dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch pickup window dates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, window } = body as { date?: string; window?: PickupTimeWindow };

    if (!date || typeof date !== "string") {
      return NextResponse.json(
        { error: "Invalid payload. Provide 'date' (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    if (!window || typeof window !== "object") {
      return NextResponse.json(
        { error: "Invalid payload. Provide 'window' with startTime and endTime." },
        { status: 400 }
      );
    }

    const { startTime, endTime, blocked } = window;
    if (typeof startTime !== "string" || typeof endTime !== "string") {
      return NextResponse.json(
        { error: "Window must have startTime and endTime strings." },
        { status: 400 }
      );
    }

    await setPickupWindowForDate(date, {
      startTime,
      endTime,
      blocked: !!blocked,
    });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error saving pickup window for date:", error);
    return NextResponse.json(
      { error: "Failed to save pickup window" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { error: "Provide 'date' query param (YYYY-MM-DD)." },
        { status: 400 }
      );
    }

    await removePickupWindowForDate(date);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error removing pickup window for date:", error);
    return NextResponse.json(
      { error: "Failed to remove pickup window" },
      { status: 500 }
    );
  }
}

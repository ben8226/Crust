import { NextResponse } from "next/server";
import { getBlockedDates, setBlockedDates, toggleBlockedDate } from "@/lib/db";

export async function GET() {
  try {
    const blockedDates = await getBlockedDates();
    return NextResponse.json(blockedDates, { status: 200 });
  } catch (error) {
    console.error("Error fetching blocked dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch blocked dates" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, action } = body;

    if (action === "toggle" && date) {
      const blockedDates = await toggleBlockedDate(date);
      return NextResponse.json(blockedDates, { status: 200 });
    }

    if (action === "set" && Array.isArray(body.dates)) {
      await setBlockedDates(body.dates);
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json(
      { error: "Invalid request. Provide 'action' and 'date' or 'dates'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating blocked dates:", error);
    return NextResponse.json(
      { error: "Failed to update blocked dates" },
      { status: 500 }
    );
  }
}


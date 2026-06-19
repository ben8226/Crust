import { NextResponse } from "next/server";
import { getSettings, getSettingByLabel, upsertSetting } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const label = searchParams.get("label");

    if (label) {
      const setting = await getSettingByLabel(label);
      return NextResponse.json(setting, { status: 200 });
    }

    const settings = await getSettings();
    return NextResponse.json(settings, { status: 200 });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const label = typeof body?.label === "string" ? body.label.trim() : "";
    const value = typeof body?.value === "string" ? body.value : "";

    if (!label) {
      return NextResponse.json({ error: "A non-empty 'label' is required." }, { status: 400 });
    }

    const setting = await upsertSetting(label, value);
    return NextResponse.json(setting, { status: 200 });
  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json({ error: "Failed to save setting" }, { status: 500 });
  }
}

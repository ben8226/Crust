import { NextResponse } from "next/server";
import { getProductDisplayConfig, setProductDisplayConfig, ProductDisplayConfig } from "@/lib/db";

export async function GET() {
  try {
    const config = await getProductDisplayConfig();
    return NextResponse.json(config, { status: 200 });
  } catch (error) {
    console.error("Error fetching display config:", error);
    return NextResponse.json(
      { error: "Failed to fetch display config" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const config = body as ProductDisplayConfig;
    await setProductDisplayConfig(config);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error saving display config:", error);
    return NextResponse.json(
      { error: "Failed to save display config" },
      { status: 500 }
    );
  }
}

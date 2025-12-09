import { NextResponse } from "next/server";
import { getOrders } from "@/lib/db";

// Diagnostic endpoint to test Redis connection
export async function GET() {
  try {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    const diagnostics = {
      environmentVariables: {
        UPSTASH_REDIS_REST_URL: url ? "✓ Set" : "✗ Missing",
        UPSTASH_REDIS_REST_TOKEN: token ? "✓ Set" : "✗ Missing",
      },
      connection: "Testing...",
      ordersCount: 0,
      error: null as string | null,
    };

    if (!url || !token) {
      return NextResponse.json(
        {
          ...diagnostics,
          connection: "✗ Failed - Missing credentials",
          error: "Environment variables not set. Please add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to your Vercel environment variables.",
        },
        { status: 200 }
      );
    }

    try {
      const orders = await getOrders();
      diagnostics.connection = "✓ Connected";
      diagnostics.ordersCount = orders.length;
    } catch (error) {
      diagnostics.connection = "✗ Failed";
      diagnostics.error = error instanceof Error ? error.message : String(error);
    }

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to run diagnostics",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


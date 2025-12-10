import { NextResponse } from "next/server";
import { deleteUpdate } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const success = await deleteUpdate(params.id);

    if (!success) {
      return NextResponse.json(
        { error: "Update not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting update:", error);
    return NextResponse.json(
      { error: "Failed to delete update" },
      { status: 500 }
    );
  }
}


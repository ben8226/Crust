import { NextResponse } from "next/server";
import { getOrderById, updateOrder, upsertSetting } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { TEXTS_REMAINING_SETTING_LABEL } from "@/types/settings";
import type { ReminderReply } from "@/types/product";

function newAdminReplyId(): string {
  return `TADMIN-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (!order.phone?.trim()) {
      return NextResponse.json({ error: "Order has no phone number" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }
    if (message.length > 1600) {
      return NextResponse.json({ error: "Message is too long" }, { status: 400 });
    }

    const result = await sendSms(order.phone, message, {
      sender: "Crust + Culture",
      webhookData: order.id,
    });

    if (result.quotaRemaining !== undefined) {
      await upsertSetting(TEXTS_REMAINING_SETTING_LABEL, String(result.quotaRemaining));
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send text" },
        { status: 500 }
      );
    }

    const adminReply: ReminderReply = {
      id: newAdminReplyId(),
      createdAt: new Date().toISOString(),
      fromNumber: "Crust + Culture",
      text: message,
      direction: "admin",
      textId: result.textId != null ? String(result.textId) : undefined,
    };

    const updated = await updateOrder(order.id, {
      reminderReplies: [adminReply, ...(order.reminderReplies || [])],
      reminderTextId: adminReply.textId || order.reminderTextId,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Text sent but failed to save on the order" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error sending order text reply:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send text" },
      { status: 500 }
    );
  }
}

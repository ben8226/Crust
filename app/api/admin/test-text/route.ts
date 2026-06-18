import { NextResponse } from "next/server";
import { getSettingByLabel, upsertSetting } from "@/lib/db";
import { sendSms } from "@/lib/sms";
import { renderTextTemplate, TEXT_TEMPLATE_EXAMPLE_TIME } from "@/lib/text-template";
import { TEXTING_MESSAGE_SETTING_LABEL, TEXTS_REMAINING_SETTING_LABEL } from "@/types/settings";

export async function POST(request: Request) {
  try {
    const adminPhone = (process.env.ADMIN_PHONE || "").trim();
    if (!adminPhone) {
      return NextResponse.json(
        { error: "ADMIN_PHONE is not configured on the server." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let template = typeof body?.message === "string" ? body.message.trim() : "";

    if (!template) {
      const setting = await getSettingByLabel(TEXTING_MESSAGE_SETTING_LABEL);
      template = setting?.value?.trim() || "";
    }

    if (!template) {
      return NextResponse.json(
        { error: "Enter a text template before sending a test." },
        { status: 400 }
      );
    }

    const pickupAddress = (process.env.NEXT_PUBLIC_PICKUP_ADDRESS || "").trim();
    const message = renderTextTemplate(template, {
      time: TEXT_TEMPLATE_EXAMPLE_TIME,
      address: pickupAddress,
    });

    const result = await sendSms(adminPhone, message, { sender: "Crust + Culture" });

    if (result.quotaRemaining !== undefined) {
      await upsertSetting(TEXTS_REMAINING_SETTING_LABEL, String(result.quotaRemaining));
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send test text" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      textId: result.textId,
      quotaRemaining: result.quotaRemaining,
    });
  } catch (error) {
    console.error("Error sending test text:", error);
    return NextResponse.json({ error: "Failed to send test text" }, { status: 500 });
  }
}

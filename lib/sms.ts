import { Order } from "@/types/product";
import { formatPickupDisplay } from "./date";

// Format order items for SMS
function formatOrderItems(order: Order): string {
  return order.items
    .map((item) => `${item.quantity}x ${item.product.name}`)
    .join(", ");
}

// Format pickup date/time for SMS
function formatPickupDateTime(order: Order): string {
  if (order.pickupDate && order.pickupTime) {
    const formattedDate = formatPickupDisplay(order.pickupDate, {
      weekday: "short",
      month: "short",
      day: "numeric",
    }) || order.pickupDate;
    return `${formattedDate} at ${order.pickupTime}`;
  }
  return "TBD";
}

// Format phone number for TextBelt (10-digit US format or E.164)
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // If it starts with 1 and has 11 digits, remove the leading 1
  if (digits.length === 11 && digits[0] === "1") {
    return digits.slice(1);
  }
  
  // If it has 10 digits, use as-is
  if (digits.length === 10) {
    return digits;
  }
  
  // Default: return last 10 digits if longer
  if (digits.length > 10) {
    return digits.slice(-10);
  }
  
  return digits;
}

// Send SMS to customer via TextBelt when order is confirmed
export async function sendOrderConfirmationSMS(order: Order): Promise<void> {
  const textbeltKey = process.env.TEXTBELT_API_KEY;

  if (!textbeltKey) {
    console.warn("TextBelt API key not configured. Skipping SMS to customer.");
    return;
  }

  try {
    const phoneNumber = formatPhoneNumber(order.phone);
    const items = formatOrderItems(order);
    const pickupInfo = formatPickupDateTime(order);
    const paymentMethod = order.paymentMethod === "venmo" ? "Venmo (pre-pay)" : "Cash (at pickup)";

    const message = `Order Confirmed! 🎉

Order #: ${order.id}
Items: ${items}
Total: $${order.total.toFixed(2)}
Payment: ${paymentMethod}
Pickup: ${pickupInfo}

Thank you for your order!`;

    const response = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phone: phoneNumber,
        message: message,
        key: textbeltKey,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error("TextBelt SMS failed:", result.error);
      // Don't throw - SMS failure shouldn't break order creation
    } else {
      console.log(`SMS sent to customer: ${phoneNumber}`);
    }
  } catch (error) {
    console.error("Error sending SMS to customer:", error);
    // Don't throw - SMS failure shouldn't break order creation
  }
}

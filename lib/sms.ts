import { Order } from "@/types/product";
import { formatPickupDisplay } from "./date";
import twilio from "twilio";

// Format phone number for Twilio (E.164 format)
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");
  
  // If it starts with 1 and has 11 digits, it's already formatted
  if (digits.length === 11 && digits[0] === "1") {
    return `+${digits}`;
  }
  
  // If it has 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  
  // Return as-is if already formatted
  if (phone.startsWith("+")) {
    return phone;
  }
  
  // Default: assume US number
  return `+1${digits}`;
}

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

// Send SMS to customer
export async function sendCustomerConfirmation(order: Order): Promise<void> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.warn("Twilio credentials not configured. Skipping SMS to customer.");
    return;
  }

  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);
    const customerPhone = formatPhoneNumber(order.phone);
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

    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: customerPhone,
    });

    console.log(`SMS sent to customer: ${customerPhone}`);
  } catch (error) {
    console.error("Error sending SMS to customer:", error);
    // Don't throw - SMS failure shouldn't break order creation
  }
}

// Send SMS to store owner
export async function sendStoreOwnerNotification(order: Order): Promise<void> {
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
  const storeOwnerPhone = process.env.STORE_OWNER_PHONE;

  if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
    console.warn("Twilio credentials not configured. Skipping SMS to store owner.");
    return;
  }

  if (!storeOwnerPhone) {
    console.warn("Store owner phone number not configured. Skipping SMS to store owner.");
    return;
  }

  try {
    const client = twilio(twilioAccountSid, twilioAuthToken);
    const ownerPhone = formatPhoneNumber(storeOwnerPhone);
    const items = formatOrderItems(order);
    const pickupInfo = formatPickupDateTime(order);
    const paymentMethod = order.paymentMethod === "venmo" ? "Venmo (pre-pay)" : "Cash (at pickup)";

    const message = `🆕 New Order Received!

Order #: ${order.id}
Customer: ${order.customerName}
Phone: ${order.phone}
Items: ${items}
Total: $${order.total.toFixed(2)}
Payment: ${paymentMethod}
Pickup: ${pickupInfo}

Order placed: ${new Date(order.date).toLocaleString()}`;

    await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: ownerPhone,
    });

    console.log(`SMS sent to store owner: ${ownerPhone}`);
  } catch (error) {
    console.error("Error sending SMS to store owner:", error);
    // Don't throw - SMS failure shouldn't break order creation
  }
}


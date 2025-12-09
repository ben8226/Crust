# SMS Notification Setup Guide

This guide will help you set up SMS notifications for order confirmations using Twilio.

## Features

- ✅ **Customer Confirmation SMS**: Customers receive a text when they place an order
- ✅ **Store Owner Notification**: You receive a text notification for every new order
- ✅ **Automatic Phone Formatting**: Phone numbers are automatically formatted for Twilio
- ✅ **Error Handling**: SMS failures won't break order creation

## Step 1: Create a Twilio Account

1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free account (includes $15.50 credit for testing)
3. Verify your phone number

## Step 2: Get Your Twilio Credentials

1. Log in to your [Twilio Console](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Copy these values (you'll need them in Step 4)

## Step 3: Get a Twilio Phone Number

1. In the Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Choose a phone number (you can get a free trial number)
3. Copy the phone number (format: +1234567890)

## Step 4: Configure Environment Variables

1. Create a `.env.local` file in the root of your project:

```bash
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
STORE_OWNER_PHONE=+1234567890
```

2. Replace the placeholder values with your actual Twilio credentials
3. **Important**: Never commit `.env.local` to git (it's already in `.gitignore`)

## Step 5: Install Dependencies

```bash
npm install
```

The Twilio package is already included in `package.json`.

## Step 6: Test the Setup

1. Start your development server:
```bash
npm run dev
```

2. Place a test order through your website
3. Check that:
   - Customer receives a confirmation SMS
   - Store owner receives a notification SMS

## SMS Message Formats

### Customer Confirmation
```
Order Confirmed! 🎉

Order #: ORD-1234567890-abc123
Items: 2x Blueberry, 1x Rosemary Parmesan
Total: $30.00
Payment: Cash (at pickup)
Pickup: Mon, Jan 15 at 2:00 PM

Thank you for your order!
```

### Store Owner Notification
```
🆕 New Order Received!

Order #: ORD-1234567890-abc123
Customer: John Doe
Phone: +1234567890
Items: 2x Blueberry, 1x Rosemary Parmesan
Total: $30.00
Payment: Cash (at pickup)
Pickup: Mon, Jan 15 at 2:00 PM

Order placed: 1/13/2024, 3:45:23 PM
```

## Phone Number Formatting

The system automatically formats phone numbers to E.164 format (required by Twilio):
- `(123) 456-7890` → `+11234567890`
- `123-456-7890` → `+11234567890`
- `1234567890` → `+11234567890`

## Troubleshooting

### SMS Not Sending

1. **Check Environment Variables**: Make sure all variables are set in `.env.local`
2. **Verify Twilio Credentials**: Double-check your Account SID and Auth Token
3. **Check Twilio Console**: Look for error messages in the Twilio Console logs
4. **Phone Number Format**: Ensure phone numbers are in E.164 format (+country code + number)

### Common Errors

- **"Invalid phone number"**: Make sure phone numbers include country code
- **"Authentication failed"**: Check your Account SID and Auth Token
- **"Insufficient funds"**: Add credits to your Twilio account

## Twilio Pricing

- **Trial Account**: $15.50 free credit
- **US SMS**: ~$0.0075 per message (less than 1 cent)
- **International SMS**: Varies by country

## Production Deployment

When deploying to production (Vercel, Netlify, etc.):

1. Add environment variables in your hosting platform's dashboard
2. Use the same variable names:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `STORE_OWNER_PHONE`

3. Restart your application after adding variables

## Disabling SMS (Optional)

If you want to temporarily disable SMS:
- Remove or comment out the environment variables
- The system will log a warning but won't break order creation

## Support

For Twilio-specific issues, check:
- [Twilio Documentation](https://www.twilio.com/docs)
- [Twilio Support](https://support.twilio.com/)

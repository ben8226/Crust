# Vercel KV Setup Guide

This guide will help you set up Vercel KV for storing orders in your deployed application.

## What is Vercel KV?

Vercel KV is a key-value database that works seamlessly with Vercel deployments. It's perfect for storing orders and other data in a serverless environment.

## Setup Steps

### Step 1: Create Vercel KV Database

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to the **Storage** tab
4. Click **Create Database**
5. Select **KV** (Key-Value)
6. Choose a name for your database (e.g., "orders-db")
7. Click **Create**

Vercel will automatically:
- Create the database
- Add environment variables to your project
- Connect it to your deployment

### Step 2: Verify Environment Variables

After creating the KV database, Vercel automatically adds these environment variables:
- `KV_URL` - Connection URL
- `KV_REST_API_URL` - REST API URL
- `KV_REST_API_TOKEN` - Authentication token
- `KV_REST_API_READ_ONLY_TOKEN` - Read-only token

These are automatically available in your Vercel deployment - no manual setup needed!

### Step 3: Redeploy

After creating the KV database:
1. Go to your project's **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

Or simply push a new commit to trigger a new deployment.

## How It Works

- **Orders are stored** in Vercel KV under the key `'orders'`
- **Data persists** across deployments and function restarts
- **No file system** needed - works perfectly in serverless environments
- **Automatic connection** - Vercel handles all the setup

## Local Development

For local development, you have two options:

### Option 1: Use Vercel KV Locally (Recommended)

1. Install Vercel CLI: `npm i -g vercel`
2. Link your project: `vercel link`
3. Pull environment variables: `vercel env pull`
4. This will create a `.env.local` file with KV credentials

### Option 2: Fallback to Empty Array

The code is designed to gracefully handle missing KV configuration:
- If KV is not configured, orders will be stored in memory
- Orders will be lost on server restart (development only)
- Production on Vercel will always have KV configured

## Testing

1. Deploy to Vercel
2. Place a test order
3. Check Vercel KV dashboard to see the stored order
4. Verify orders persist across deployments

## Pricing

- **Free Tier**: 256 MB storage, 30,000 reads/day, 30,000 writes/day
- **Pro Tier**: $20/month - More storage and higher limits
- Perfect for small to medium businesses

## Troubleshooting

### Orders Not Saving

- Check that KV database is created in Vercel dashboard
- Verify environment variables are set (automatic)
- Check deployment logs for errors
- Ensure you've redeployed after creating KV

### Build Errors

- Make sure `@vercel/kv` is in `package.json` dependencies
- Run `npm install` locally to verify
- Check that all async/await is properly used

## Migration from File System

If you had orders in `data/orders.json`:
1. The old file-based storage won't work on Vercel
2. Orders will start fresh with Vercel KV
3. You can manually import old orders if needed (contact support for help)

## Support

- [Vercel KV Documentation](https://vercel.com/docs/storage/vercel-kv)
- [Vercel Support](https://vercel.com/support)


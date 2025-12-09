# Upstash Redis Setup Guide

This guide will help you set up Upstash Redis for storing orders in your deployed application.

## What is Upstash Redis?

Upstash Redis is a serverless Redis database that works seamlessly with Vercel and Next.js. It's perfect for storing orders and other data in a serverless environment with excellent performance and global distribution.

## Why Upstash Redis?

- ✅ **Serverless**: Pay only for what you use
- ✅ **Global**: Low latency worldwide
- ✅ **Durable**: Data persists across deployments
- ✅ **Free Tier**: Generous free tier for small projects
- ✅ **Easy Integration**: Works perfectly with Vercel

## Setup Steps

### Step 1: Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up or log in (free account available)
3. Click **Create Database**
4. Choose a name for your database (e.g., "orders-db")
5. Select a region closest to your users
6. Choose **Regional** or **Global** (Regional is free, Global has a cost)
7. Click **Create**

### Step 2: Get Your Credentials

After creating the database, you'll see:
- **UPSTASH_REDIS_REST_URL** - REST API URL
- **UPSTASH_REDIS_REST_TOKEN** - Authentication token

Copy these values - you'll need them in the next step.

### Step 3: Add Environment Variables to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add the following variables:

   - **Name**: `UPSTASH_REDIS_REST_URL`
     **Value**: (paste your REST URL from Upstash)
   
   - **Name**: `UPSTASH_REDIS_REST_TOKEN`
     **Value**: (paste your REST token from Upstash)

5. Make sure to add them for **Production**, **Preview**, and **Development** environments
6. Click **Save**

### Step 4: Install Dependencies

The `@upstash/redis` package is already in your `package.json`. If you need to install it:

```bash
npm install @upstash/redis
```

### Step 5: Redeploy

After adding environment variables:
1. Go to your project's **Deployments** tab
2. Click the **...** menu on the latest deployment
3. Click **Redeploy**

Or simply push a new commit to trigger a new deployment.

## How It Works

- **Orders are stored** in Upstash Redis under the key `'orders'`
- **Data persists** across deployments and function restarts
- **No file system** needed - works perfectly in serverless environments
- **Fast reads/writes** - Optimized for serverless workloads

## Local Development

For local development, you have two options:

### Option 1: Use Upstash Redis Locally (Recommended)

1. Create a `.env.local` file in your project root
2. Add your Upstash credentials:

```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

3. Restart your development server: `npm run dev`

### Option 2: Fallback to Empty Array

The code is designed to gracefully handle missing Redis configuration:
- If Redis is not configured, orders will be stored in memory
- Orders will be lost on server restart (development only)
- Production on Vercel will always have Redis configured

## Testing

### Test Database Connection

After deploying, you can test your database connection by visiting:
```
https://your-app.vercel.app/api/orders/test
```

This diagnostic endpoint will show:
- ✓/✗ Environment variables status
- ✓/✗ Connection status
- Number of orders in database
- Any error messages

### Test Order Creation

1. Deploy to Vercel
2. Place a test order through the checkout page
3. Check the diagnostic endpoint to verify the order was saved
4. Check Upstash Console to see the stored order
5. Verify orders persist across deployments

## Pricing

- **Free Tier**: 
  - 10,000 commands/day
  - 256 MB storage
  - Regional databases
  - Perfect for small to medium businesses

- **Pay As You Go**: 
  - $0.20 per 100K commands
  - $0.10 per GB storage/month
  - Global databases available

## Troubleshooting

### Orders Not Saving

- Check that Redis database is created in Upstash console
- Verify environment variables are set in Vercel
- Check deployment logs for errors
- Ensure you've redeployed after adding environment variables
- Verify credentials are correct (no extra spaces)

### Build Errors

- Make sure `@upstash/redis` is in `package.json` dependencies
- Run `npm install` locally to verify
- Check that all async/await is properly used

### Connection Errors

- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Check that the database is active in Upstash console
- Ensure the region matches your deployment region
- Visit `/api/orders/test` to see detailed diagnostics

### Orders Not Appearing in Database

1. **Check Environment Variables**:
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Verify both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
   - Make sure they're added for **Production**, **Preview**, and **Development**
   - **Important**: After adding/changing environment variables, you must **redeploy**

2. **Check Deployment Logs**:
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment → View Function Logs
   - Look for Redis connection messages (✓ or ✗)
   - Look for "Order saved successfully" messages

3. **Test the Connection**:
   - Visit `https://your-app.vercel.app/api/orders/test`
   - This will show you exactly what's wrong

4. **Verify in Upstash Console**:
   - Go to [Upstash Console](https://console.upstash.com/)
   - Select your database
   - Check the "Data" tab to see if the `orders` key exists
   - You should see a key named `orders` with your order data

5. **Common Issues**:
   - **Environment variables not set**: Add them in Vercel and redeploy
   - **Wrong credentials**: Double-check you copied the correct URL and token
   - **Database paused**: Check if your Upstash database is active
   - **Free tier limits**: Check if you've exceeded your daily command limit

## Migration from Vercel KV

If you were using Vercel KV:
1. The data structure is the same (JSON array of orders)
2. Orders will start fresh with Upstash Redis
3. You can manually export/import orders if needed

## Support

- [Upstash Documentation](https://docs.upstash.com/redis)
- [Upstash Console](https://console.upstash.com/)
- [Upstash Support](https://upstash.com/support)


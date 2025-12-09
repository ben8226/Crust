# Website Deployment Guide

This guide will help you deploy your product ordering website so it's accessible to everyone on the internet.

## Recommended Hosting Options

### Option 1: Vercel (Recommended for Next.js) ⭐

**Best for**: Next.js applications (Vercel is made by the creators of Next.js)

**Pros:**
- ✅ Free tier available
- ✅ Automatic deployments from GitHub
- ✅ Built-in SSL certificates
- ✅ Optimized for Next.js
- ✅ Easy environment variable management
- ✅ Custom domain support

**Steps:**

1. **Prepare your code:**
   ```bash
   # Make sure everything is committed to git
   git add .
   git commit -m "Ready for deployment"
   ```

2. **Push to GitHub:**
   - Create a repository on [GitHub](https://github.com)
   - Push your code:
   ```bash
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

3. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js settings
   - Click "Deploy"

4. **Add Environment Variables:**
   - In your Vercel project dashboard, go to Settings → Environment Variables
   - Add these variables:
     ```
     TWILIO_ACCOUNT_SID=your_value
     TWILIO_AUTH_TOKEN=your_value
     TWILIO_PHONE_NUMBER=your_value
     STORE_OWNER_PHONE=your_value
     ```
   - Redeploy after adding variables

5. **Your site will be live at:**
   - `your-project-name.vercel.app`
   - You can add a custom domain later

---

### Option 2: Netlify

**Best for**: General web applications

**Pros:**
- ✅ Free tier available
- ✅ Easy deployment
- ✅ Good for static sites
- ✅ Custom domain support

**Steps:**

1. **Build your project:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login
   - Drag and drop your `.next` folder OR connect to GitHub
   - Add build command: `npm run build`
   - Add publish directory: `.next`

3. **Add Environment Variables:**
   - Site settings → Environment variables
   - Add your Twilio credentials

---

### Option 3: Railway

**Best for**: Full-stack applications with backend needs

**Pros:**
- ✅ Easy deployment
- ✅ Database options
- ✅ Good for APIs

**Steps:**
- Go to [railway.app](https://railway.app)
- Connect GitHub repository
- Railway auto-detects Next.js
- Add environment variables in dashboard

---

### Option 4: Traditional Hosting (VPS/Shared)

**Best for**: More control, custom server setup

**Options:**
- DigitalOcean
- AWS
- Google Cloud
- Heroku (paid)

**More complex setup required** - need to configure Node.js, build process, etc.

---

## Pre-Deployment Checklist

Before deploying, make sure:

- [ ] All code is committed to git
- [ ] `.env.local` is NOT committed (it's in `.gitignore`)
- [ ] Environment variables are documented
- [ ] Test the build locally: `npm run build`
- [ ] Test locally: `npm start`

## Environment Variables Setup

### For Vercel/Netlify:

1. **In your hosting dashboard**, add these environment variables:

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
STORE_OWNER_PHONE=+1234567890
```

2. **After adding variables**, redeploy your site

### Important Notes:

- ⚠️ Never commit `.env.local` to git
- ⚠️ Environment variables are case-sensitive
- ⚠️ Phone numbers must include country code (+1 for US)

## Custom Domain Setup

### Option 1: Free Subdomain
- Vercel: `your-site.vercel.app`
- Netlify: `your-site.netlify.app`

### Option 2: Custom Domain

1. **Buy a domain** from:
   - Namecheap
   - Google Domains
   - GoDaddy
   - Cloudflare

2. **Connect to Vercel:**
   - Project Settings → Domains
   - Add your domain
   - Follow DNS configuration instructions

3. **Connect to Netlify:**
   - Site settings → Domain management
   - Add custom domain
   - Configure DNS records

## Post-Deployment Steps

1. **Test your live site:**
   - Visit your deployed URL
   - Test placing an order
   - Verify SMS notifications work

2. **Update any hardcoded URLs:**
   - Check if you have any localhost references
   - Update to your production URL

3. **Monitor:**
   - Check Vercel/Netlify dashboard for errors
   - Monitor Twilio console for SMS delivery

## Troubleshooting

### Build Fails

- Check build logs in hosting dashboard
- Common issues:
  - Missing dependencies (run `npm install`)
  - TypeScript errors
  - Missing environment variables

### SMS Not Working

- Verify environment variables are set in hosting dashboard
- Check Twilio console for errors
- Ensure phone numbers are in correct format

### Images Not Loading

- Make sure images are in `public/images/` folder
- Check image paths in `data/products.ts`
- Verify file names match exactly

## Cost Estimates

### Free Tier (Good for starting):

- **Vercel**: Free for personal projects
- **Netlify**: Free tier available
- **Twilio**: $15.50 free credit, then ~$0.0075 per SMS
- **Domain**: ~$10-15/year (optional)

### Paid (if you need more):

- Vercel Pro: $20/month
- More Twilio credits as needed
- Custom domain: ~$10-15/year

## Quick Start (Vercel - Easiest)

```bash
# 1. Install Vercel CLI (optional, can use web interface)
npm i -g vercel

# 2. Login
vercel login

# 3. Deploy
vercel

# 4. Follow prompts
# 5. Add environment variables in dashboard
# 6. Done! Your site is live
```

## Recommended: Vercel

For Next.js applications, **Vercel is the easiest and best option** because:
- Made by Next.js creators
- Zero configuration needed
- Free tier is generous
- Automatic HTTPS
- Easy environment variable management
- Great performance

## Need Help?

- Vercel Docs: https://vercel.com/docs
- Netlify Docs: https://docs.netlify.com
- Next.js Deployment: https://nextjs.org/docs/deployment


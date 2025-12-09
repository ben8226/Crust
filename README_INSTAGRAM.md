# Instagram Integration Guide

This project includes several ways to integrate Instagram into your website.

## Options Available

### 1. Footer with Instagram Link (✅ Implemented)
- **Location**: `components/Footer.tsx`
- **Usage**: Automatically added to all pages
- **Features**: Instagram icon and link to your profile
- **Customization**: Update `instagramUrl` prop in Footer component

### 2. Instagram Embed Component (✅ Implemented)
- **Location**: `components/InstagramEmbed.tsx`
- **Usage**: Embed individual Instagram posts
- **Features**: Uses Instagram's official embed API
- **Example**: 
  ```tsx
  <InstagramEmbed url="https://www.instagram.com/p/YOUR_POST_ID/" />
  ```

### 3. Instagram Page (✅ Implemented)
- **Location**: `app/instagram/page.tsx`
- **URL**: `/instagram`
- **Features**: Dedicated page for Instagram content
- **Customization**: Update `instagramPostUrl` and `instagramProfileUrl`

## How to Use

### Option 1: Simple Link (Easiest)
The Footer component already includes an Instagram link. Just update the URL:

```tsx
<Footer instagramUrl="https://www.instagram.com/yourusername" />
```

### Option 2: Embed a Single Post
Add to any page:

```tsx
import InstagramEmbed from "@/components/InstagramEmbed";

<InstagramEmbed url="https://www.instagram.com/p/YOUR_POST_ID/" />
```

### Option 3: Instagram Feed Widget
For a full feed, you'll need to:
1. Use Instagram Basic Display API (requires app registration)
2. Use a third-party service like:
   - [SnapWidget](https://snapwidget.com/)
   - [Elfsight](https://elfsight.com/instagram-feed/)
   - [Juicer](https://www.juicer.io/)

### Option 4: Instagram Profile Embed
Add an iframe to embed your profile:

```tsx
<iframe
  src="https://www.instagram.com/yourusername/embed"
  width="400"
  height="500"
  frameBorder="0"
/>
```

## Instagram API Options

### Instagram Basic Display API
- **Best for**: Custom feeds, authenticated access
- **Requires**: Facebook Developer account, app registration
- **Documentation**: https://developers.facebook.com/docs/instagram-basic-display-api

### Instagram Graph API
- **Best for**: Business accounts, advanced features
- **Requires**: Facebook Business account, app registration
- **Documentation**: https://developers.facebook.com/docs/instagram-api

## Quick Setup

1. **Update Footer Instagram URL**:
   Edit `components/Footer.tsx` and change the default URL:
   ```tsx
   <Footer instagramUrl="https://www.instagram.com/yourusername" />
   ```

2. **Add Instagram Link to Navbar** (Optional):
   Edit `components/Navbar.tsx`:
   ```tsx
   <a href="https://www.instagram.com/yourusername" target="_blank">
     Instagram
   </a>
   ```

3. **Create Instagram Section on Homepage** (Optional):
   Add to `app/page.tsx`:
   ```tsx
   <section className="my-12">
     <h2>Follow Us on Instagram</h2>
     <InstagramEmbed url="YOUR_POST_URL" />
   </section>
   ```

## Notes

- Instagram embeds require posts to be **public**
- Some embedding methods may require Instagram/Facebook app approval
- For production, consider using Instagram's official APIs for better performance
- Always test embeds on mobile devices



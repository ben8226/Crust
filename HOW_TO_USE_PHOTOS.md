# How to Use Your Own Photos

## Option 1: Store Images in Public Folder (Recommended)

1. **Move your photos** from `data/Photos/` to `public/images/`
   - Create the folder: `public/images/`
   - Copy your image files there
   - Recommended: Rename files to be descriptive (e.g., `blueberry-bread.jpg`)

2. **Update products.ts** to use local paths:
   ```typescript
   image: "/images/blueberry-bread.jpg"
   ```

   Note: In Next.js, files in `public/` are served from the root, so `/images/filename.jpg` works.

## Option 2: Use External URLs

If you upload your photos to:
- Cloud storage (Google Drive, Dropbox - make public)
- Image hosting (Imgur, Cloudinary)
- Your own server

Then use the full URL:
```typescript
image: "https://your-domain.com/images/blueberry-bread.jpg"
```

## Option 3: Use Photos from data/Photos Folder

If you want to keep photos in `data/Photos/`, you'll need to:
1. Move them to `public/images/` (Next.js requires static assets in public folder)
2. Or set up an API route to serve them

## Quick Steps:

1. **Copy your photos** to `public/images/`:
   ```
   public/
     images/
       blueberry.jpg
       rosemary-parmesan.jpg
       glazed-honey-butter.jpg
       ... (your other photos)
   ```

2. **Update `data/products.ts`** - Replace the `image` field for each product:
   ```typescript
   {
     id: "1",
     name: "Blueberry",
     image: "/images/blueberry.jpg",  // ← Change this
     // ... rest of product
   }
   ```

3. **Image file naming tips**:
   - Use lowercase letters
   - Use hyphens instead of spaces: `blueberry-bread.jpg`
   - Keep file extensions: `.jpg`, `.jpeg`, `.png`, `.webp`

## Example Update:

**Before:**
```typescript
image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500"
```

**After:**
```typescript
image: "/images/blueberry-bread.jpg"
```

That's it! Your photos will now display on your website.


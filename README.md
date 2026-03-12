# Product Order Website


A modern, full-stack product ordering website built with Next.js, TypeScript, and Tailwind CSS.

## Features

- 🛍️ **Product Catalog** - Browse a selection of products with images and descriptions
- 🛒 **Shopping Cart** - Add products to cart, update quantities, and manage items
- 💳 **Checkout Process** - Complete order form with customer information
- ✅ **Order Confirmation** - View order details and confirmation
- 📱 **SMS Notifications** - Automatic text messages to customers and store owner
- 🔌 **RESTful API** - Next.js API routes for products and orders
- 💾 **Data Persistence** - Orders saved to file system (JSON)
- 📱 **Responsive Design** - Works beautifully on all devices

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Install dependencies (including Twilio for SMS):
```bash
npm install
```

3. Set up SMS notifications (optional):
   - See `SMS_SETUP.md` for detailed instructions
   - Create `.env.local` with your Twilio credentials

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── products/      # Product endpoints
│   │   └── orders/        # Order endpoints
│   ├── page.tsx           # Home page (product catalog)
│   ├── cart/              # Shopping cart page
│   ├── checkout/          # Checkout page
│   └── order-confirmation/ # Order confirmation page
├── components/            # React components
│   ├── Navbar.tsx         # Navigation bar
│   └── ProductCard.tsx    # Product card component
├── contexts/              # React contexts
│   └── CartContext.tsx    # Shopping cart state management
├── data/                  # Data files
│   ├── products.ts        # Sample product data
│   └── orders.json        # Stored orders (created at runtime)
├── lib/                   # Utility libraries
│   └── db.ts              # Database/file operations
└── types/                 # TypeScript type definitions
    └── product.ts         # Product and order types
```

## Technologies Used

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **React Context API** - State management for cart
- **Next.js API Routes** - Server-side API endpoints
- **File System Storage** - JSON-based order persistence

## Customization

### Adding Products

Edit `data/products.ts` to add or modify products:

```typescript
{
  id: "unique-id",
  name: "Product Name",
  description: "Product description",
  price: 99.99,
  image: "https://image-url.com/image.jpg",
  category: "Category",
  inStock: true,
}
```

### Styling

The project uses Tailwind CSS. Modify `tailwind.config.ts` to customize colors, fonts, and other design tokens.

## Building for Production

```bash
npm run build
npm start
```

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/[id]` - Get a single product by ID

### Orders
- `POST /api/orders` - Create a new order
- `GET /api/orders` - Get all orders
- `GET /api/orders/[id]` - Get a single order by ID

## Data Storage

Orders are stored using **Upstash Redis** (serverless Redis database) for production deployments. This works seamlessly with Vercel's serverless environment and provides excellent performance.

### Setting Up Upstash Redis

1. Create a free account at [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy your `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
4. Add these as environment variables in your Vercel project
5. Redeploy your application

See `UPSTASH_REDIS_SETUP.md` for detailed instructions.

### Local Development

For local development, create a `.env.local` file with your Upstash credentials:
```env
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token-here
```

Without these variables, the app will work but orders won't persist (stored in memory).

### Alternative Storage Options

For other hosting platforms or custom setups, consider:
- PostgreSQL
- MongoDB
- SQLite
- Supabase
- PlanetScale

## SMS Notifications

The app includes SMS notification functionality using Twilio:
- **Customer Confirmation**: Customers receive a text when they place an order
- **Store Owner Alerts**: Store owner receives notifications for new orders

See `SMS_SETUP.md` for complete setup instructions.

## Future Enhancements

- Database integration (PostgreSQL/MongoDB)
- User authentication
- Payment processing
- Order history for users
- Product search and filtering
- Admin dashboard
- Inventory management
- Email notifications

## License

MIT

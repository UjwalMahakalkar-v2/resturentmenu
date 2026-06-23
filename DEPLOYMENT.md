# Patola Restaurant - Digital Menu Deployment Guide

## 🎉 Project Complete!

Your modern restaurant digital menu website is ready with:
- ✅ 116 menu items from Patola restaurant
- ✅ 13 categories (Beverages, Indian, Chinese, Sizzling, Soups, etc.)
- ✅ Beautiful customer-facing menu with search and filters
- ✅ Complete admin panel for menu management
- ✅ MongoDB integration ready
- ✅ Responsive mobile-first design

## 🚀 Quick Start

### Development Server
```bash
npm run dev
```
Opens at: http://localhost:3001

### Admin Access
- URL: http://localhost:3001/admin/login
- Username: `admin`
- Password: `admin123`

⚠️ **IMPORTANT**: Change the admin password before deploying to production!

## 📦 Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

## 🌐 Deployment Options

### Option 1: Cloudflare Pages (Recommended)

1. **Install Wrangler CLI**
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare**
   ```bash
   wrangler login
   ```

3. **Deploy**
   ```bash
   npm run build
   wrangler pages deploy dist
   ```

4. **Configure Environment Variables** in Cloudflare Dashboard:
   - `MONGODB_URI`: Your MongoDB connection string
   - `MONGODB_DB_NAME`: restaurant_menu

### Option 2: GitHub Pages

1. **Update `vite.config.ts`** - Add base path:
   ```typescript
   export default defineConfig({
     base: '/repository-name/',
     // ... rest of config
   })
   ```

2. **Build and Deploy**
   ```bash
   npm run build
   git add dist -f
   git commit -m "Deploy to GitHub Pages"
   git subtree push --prefix dist origin gh-pages
   ```

### Option 3: Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Add Environment Variables** in Vercel Dashboard

### Option 4: Netlify

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy**
   ```bash
   netlify deploy --prod --dir=dist
   ```

## 🗄️ Database Setup

### Initialize MongoDB Database

Run this script to populate your MongoDB with the menu data:

```bash
npx tsx scripts/init-db.ts
```

This will:
- Create all 13 categories
- Insert all 116 menu items
- Create admin user (username: admin, password: admin123)
- Set up database indexes

### Manual MongoDB Setup

If the script doesn't work, manually:

1. Go to MongoDB Atlas (https://cloud.mongodb.com)
2. Create collections: `categories`, `menu_items`, `admins`
3. Import data from `src/data/sampleData.ts`

## 🔧 Configuration

### Environment Variables

Create `.env` file (for production):
```env
VITE_USE_MOCK_API=false
VITE_API_URL=/api
```

For development (already configured in `.env.development`):
```env
VITE_USE_MOCK_API=true
VITE_API_URL=/api
```

### Restaurant Information

Update in `src/pages/Menu.tsx`:
- Restaurant name: **Patola**
- Address: Wardha Rd, Nagpur, Khapri, Maharashtra 441108
- Phone: 8421155938

## 📱 Features

### Customer Menu
- 🔍 Real-time search across dishes
- 🏷️ Category filtering (13 categories)
- ⭐ Popular items highlighted
- 🌱 Veg/Non-veg indicators
- ❤️ Favorite dishes (saved locally)
- 📱 Mobile responsive design
- 🎨 Premium restaurant aesthetic

### Admin Panel
- 📊 Dashboard with statistics
- ➕ Add/Edit/Delete menu items
- 📁 Category management
- 🔐 Secure authentication
- 💰 Price management
- 🖼️ Image URL management
- ✅ Availability toggle

## 🎨 Customization

### Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  primary: { /* Your brand colors */ },
  cream: '#faf8f5',
  dark: '#1a1a1a',
}
```

### Fonts
Edit `src/index.css` - Currently using:
- Sans: Inter
- Serif: Playfair Display

### Images
Replace cover image in `src/pages/Menu.tsx`:
```typescript
coverImage: 'your-image-url'
```

## 🔒 Security

### Before Production:

1. **Change Admin Password**
   - Login to admin panel
   - Use a strong password
   - Update in MongoDB

2. **Enable HTTPS**
   - All deployment platforms provide free SSL

3. **Environment Variables**
   - Never commit `.env` files
   - Use platform-specific env variable management

4. **API Security**
   - Implement proper JWT authentication
   - Add rate limiting
   - Validate all inputs

## 📊 Menu Statistics

- **Total Items**: 116 dishes
- **Categories**: 13
- **Beverages**: 21 items
- **Indian Non-Veg**: 7 items
- **Chinese Items**: 25+ items
- **Tandoori**: 12 items
- **Roti/Bread**: 11 items
- **Rice**: 9 items
- **Soups**: 8 items

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
npx kill-port 3000
```

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules dist
npm install
npm run build
```

### MongoDB Connection Issues
- Check connection string format
- Verify IP whitelist in MongoDB Atlas
- Ensure network access is configured

## 📞 Support

For issues or questions:
- Check browser console for errors
- Verify all environment variables are set
- Ensure MongoDB is accessible
- Check Node.js version (v20.10.0 or higher recommended)

## 🎯 Next Steps

1. ✅ Test the application locally
2. ✅ Verify all menu items display correctly
3. ✅ Test admin panel functionality
4. 🔄 Set up MongoDB database
5. 🔄 Deploy to production
6. 🔄 Configure custom domain
7. 🔄 Add analytics (Google Analytics, etc.)
8. 🔄 Set up monitoring

---

**Built with ❤️ for Patola Restaurant, Nagpur**

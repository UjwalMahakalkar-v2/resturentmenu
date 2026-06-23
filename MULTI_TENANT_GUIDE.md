# Multi-Tenant Restaurant Menu System - User Guide

## 🏢 System Overview

This is a multi-tenant restaurant menu system where multiple restaurants can use the same platform with their own isolated data and custom URLs.

---

## 📋 Table of Contents

1. [URL Structure](#url-structure)
2. [User Roles](#user-roles)
3. [Accessing the System](#accessing-the-system)
4. [Super Admin Guide](#super-admin-guide)
5. [Restaurant Admin Guide](#restaurant-admin-guide)
6. [Customer View](#customer-view)
7. [Multi-Tenant Features](#multi-tenant-features)

---

## 🔗 URL Structure

### Default/Main Restaurant
- **Menu:** `https://resturentmenu.resturentmenu.workers.dev/`
- **Admin Login:** `https://resturentmenu.resturentmenu.workers.dev/admin/login`
- **Admin Dashboard:** `https://resturentmenu.resturentmenu.workers.dev/admin/dashboard`

### Tenant-Specific URLs
Each restaurant gets its own slug-based URL:

- **Menu:** `https://resturentmenu.resturentmenu.workers.dev/{tenant-slug}`
- **Admin Login:** `https://resturentmenu.resturentmenu.workers.dev/{tenant-slug}/admin/login`
- **Admin Dashboard:** `https://resturentmenu.resturentmenu.workers.dev/{tenant-slug}/admin/dashboard`

**Example for "Pizza Palace" (slug: `pizza-palace`):**
- Menu: `https://resturentmenu.resturentmenu.workers.dev/pizza-palace`
- Admin: `https://resturentmenu.resturentmenu.workers.dev/pizza-palace/admin/login`

### Super Admin URLs
- **Login:** `https://resturentmenu.resturentmenu.workers.dev/super-admin/login`
- **Dashboard:** `https://resturentmenu.resturentmenu.workers.dev/super-admin`

---

## 👥 User Roles

### 1. **Super Admin**
- Full system access
- Can create/manage all tenants (restaurants)
- Can view all restaurants' data
- Manages platform-wide settings

### 2. **Restaurant Admin**
- Access to their own restaurant only
- Manage menu items and categories
- Update restaurant settings (name, logo, colors)
- Cannot see other restaurants' data

### 3. **Customer**
- View menu (no login required)
- Mark items as favorites
- Filter by categories
- Search menu items

---

## 🚀 Accessing the System

### For Customers (Public Access)
1. Visit the restaurant's URL
2. Browse the menu
3. Use filters and search
4. Mark favorites (stored locally)

### For Restaurant Admins
1. Go to `/{tenant-slug}/admin/login` or `/admin/login` (for default)
2. Enter your credentials
3. Access your dashboard

### For Super Admin
1. Go to `/super-admin/login`
2. Enter super admin credentials
3. Access the super admin dashboard

---

## 🔧 Super Admin Guide

### Creating a New Tenant (Restaurant)

1. **Login** to Super Admin Dashboard
2. Click **"Add New Tenant"**
3. Fill in the details:
   - **Restaurant Name:** Display name (e.g., "Pizza Palace")
   - **Slug:** URL-friendly identifier (e.g., "pizza-palace")
   - **Admin Username:** Login username for restaurant admin
   - **Admin Password:** Secure password
   - **Contact Email:** Restaurant contact email
   - **Phone:** Restaurant phone number

4. Click **"Create Tenant"**

### Managing Tenants

- **View All Tenants:** See list of all restaurants
- **Edit Tenant:** Update restaurant details
- **Delete Tenant:** Remove a restaurant (and all its data)
- **View Tenant Menu:** Quick link to see their public menu

### Tenant Isolation

Each tenant has:
- ✅ Separate menu items
- ✅ Separate categories
- ✅ Separate admin credentials
- ✅ Separate restaurant settings
- ✅ Unique URL slug

---

## 🍽️ Restaurant Admin Guide

### Logging In

1. Navigate to your admin login URL:
   - Default: `/admin/login`
   - Tenant: `/{your-slug}/admin/login`
2. Enter your username and password
3. Click **"Sign In"**

### Managing Menu Items

#### Adding a Menu Item
1. Go to **Admin Dashboard**
2. Click **"Add New Item"**
3. Fill in the form:
   - **Name:** Item name (e.g., "Margherita Pizza")
   - **Description:** Brief description
   - **Price:** Price in your currency
   - **Category:** Select from dropdown
   - **Image URL:** Link to item image (optional)
   - **Dietary Tags:** Vegetarian, Vegan, Gluten-Free, Spicy
   - **Featured:** Mark as featured item
   - **Available:** Toggle availability

4. Click **"Save"**

#### Editing a Menu Item
1. Find the item in your dashboard
2. Click the **Edit** icon (pencil)
3. Update the fields
4. Click **"Save"**

#### Deleting a Menu Item
1. Find the item in your dashboard
2. Click the **Delete** icon (trash)
3. Confirm deletion

### Managing Categories

#### Adding a Category
1. Switch to **"Categories"** tab
2. Click **"Add Category"**
3. Enter:
   - **Name:** Category name (e.g., "Pizzas")
   - **Description:** Brief description
   - **Icon:** Emoji or icon (optional)
4. Click **"Save"**

#### Deleting a Category
1. Find the category
2. Click **Delete**
3. Confirm (note: items in this category will remain but lose category assignment)

### Restaurant Settings

1. Go to **"Settings"** tab
2. Update:
   - **Restaurant Name**
   - **Logo URL**
   - **Primary Color** (for branding)
   - **Currency Symbol**
   - **Contact Information**
3. Click **"Save Settings"**

### Logging Out
- Click **"Logout"** button in the top-right corner

---

## 👀 Customer View

### Browsing the Menu

1. Visit the restaurant URL
2. See all available menu items
3. Use the category filter to narrow down
4. Use search to find specific items

### Features Available to Customers

- **Category Filtering:** Click category buttons to filter
- **Search:** Type to search by name or description
- **Favorites:** Click heart icon to save favorites (local storage)
- **Item Details:** View full description, price, and dietary info
- **Featured Items:** Highlighted items appear first

---

## 🏗️ Multi-Tenant Features

### Data Isolation

Each tenant's data is completely isolated:

```
Tenant A (pizza-palace)
├── Menu Items (only Pizza Palace items)
├── Categories (only Pizza Palace categories)
├── Settings (Pizza Palace branding)
└── Admin Access (Pizza Palace admin only)

Tenant B (burger-joint)
├── Menu Items (only Burger Joint items)
├── Categories (only Burger Joint categories)
├── Settings (Burger Joint branding)
└── Admin Access (Burger Joint admin only)
```

### Context-Based Routing

The system uses `TenantContext` to automatically:
- Detect which tenant is being accessed (from URL slug)
- Load only that tenant's data
- Apply tenant-specific branding
- Restrict admin access to tenant's own data

### Default Tenant

If no tenant slug is provided in the URL:
- System loads the default/main restaurant
- Uses default branding and settings
- Shows default menu items

---

## 🔐 Authentication & Security

### Admin Authentication
- JWT-based authentication
- Token stored in localStorage
- Auto-redirect to login if not authenticated
- Session persists until logout

### Route Protection
- Admin routes require valid token
- Automatic redirect to login page
- Token validation on protected routes

### Tenant Isolation Security
- Admins can only access their own tenant's data
- API calls include tenant context
- Super admin has override access to all tenants

---

## 📱 Responsive Design

The system is fully responsive:
- ✅ Mobile-friendly menu browsing
- ✅ Touch-optimized admin dashboard
- ✅ Adaptive layouts for all screen sizes

---

## 🎨 Customization

### Per-Tenant Branding
Each restaurant can customize:
- Restaurant name
- Logo
- Primary color theme
- Currency symbol
- Contact information

### Global Settings (Super Admin Only)
- Platform-wide configurations
- Default settings for new tenants
- System-level customization

---

## 🛠️ Technical Details

### Technology Stack
- **Frontend:** React 19, TypeScript, TailwindCSS
- **Routing:** React Router v7
- **State Management:** React Context API
- **Icons:** Lucide React
- **Notifications:** React Hot Toast
- **Deployment:** Cloudflare Pages

### API Structure
```
/api/menu          - Get menu items (tenant-aware)
/api/categories    - Get categories (tenant-aware)
/api/auth/login    - Admin authentication
```

### Local Storage Keys
- `admin_token` - Admin authentication token
- `favorites` - User's favorite items
- `restaurant_settings` - Restaurant configuration

---

## 📞 Support & Troubleshooting

### Common Issues

**Issue:** Can't access admin panel
- **Solution:** Ensure you're using lowercase `/admin/login` (not `/Admin/Login`)
- **Solution:** Check if you're using the correct tenant slug

**Issue:** Menu items not showing
- **Solution:** Check if items are marked as "Available"
- **Solution:** Verify category assignment

**Issue:** Blank page
- **Solution:** Clear browser cache
- **Solution:** Check browser console for errors

### Getting Help
- Check browser console for error messages
- Verify URL structure is correct
- Ensure you're logged in with correct credentials

---

## 🚀 Quick Start Guide

### For Super Admin
1. Login at `/super-admin/login`
2. Create new tenant
3. Provide credentials to restaurant admin

### For Restaurant Admin
1. Receive credentials from super admin
2. Login at `/{your-slug}/admin/login`
3. Add categories
4. Add menu items
5. Customize settings
6. Share menu URL with customers

### For Customers
1. Visit restaurant URL
2. Browse menu
3. Enjoy! 🍕

---

## 📊 Best Practices

### For Restaurant Admins
- ✅ Use high-quality images for menu items
- ✅ Write clear, appetizing descriptions
- ✅ Keep prices up to date
- ✅ Mark unavailable items promptly
- ✅ Use categories effectively
- ✅ Feature your best items

### For Super Admins
- ✅ Use descriptive, URL-friendly slugs
- ✅ Provide strong passwords to restaurant admins
- ✅ Regularly backup tenant data
- ✅ Monitor system performance

---

## 🔄 Updates & Maintenance

### Regular Tasks
- Update menu items as needed
- Review and update prices
- Add seasonal items
- Remove discontinued items
- Update restaurant information

---

**Version:** 1.0  
**Last Updated:** June 23, 2026  
**Platform:** Cloudflare Pages  
**Support:** Contact system administrator

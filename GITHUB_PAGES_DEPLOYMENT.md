# 🚀 GitHub Pages Deployment Guide

Complete step-by-step guide to deploy your Patola Restaurant Menu to GitHub Pages.

## 📋 Prerequisites

- GitHub account
- Git installed on your computer
- Your project code ready

---

## 🎯 Step-by-Step Deployment

### Step 1: Update Repository Name in Config

**IMPORTANT**: Update the base path in `vite.config.ts` to match your GitHub repository name.

Open `vite.config.ts` and change this line:
```typescript
base: command === 'build' ? '/Resturent_menu/' : '/',
```

Replace `Resturent_menu` with your actual repository name. For example:
- If your repo is `patola-menu`, use: `'/patola-menu/'`
- If your repo is `restaurant-website`, use: `'/restaurant-website/'`

**Example:**
```typescript
base: command === 'build' ? '/patola-menu/' : '/',
```

---

### Step 2: Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click the **"+"** icon → **"New repository"**
3. Fill in details:
   - **Repository name**: `Resturent_menu` (or your preferred name)
   - **Description**: "Patola Restaurant Digital Menu"
   - **Visibility**: Public (required for free GitHub Pages)
   - **DO NOT** initialize with README, .gitignore, or license
4. Click **"Create repository"**

---

### Step 3: Initialize Git and Push Code

Open terminal in your project folder and run:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Patola Restaurant Menu"

# Add remote repository (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Example:**
```bash
git remote add origin https://github.com/ayushmahakalkar/Resturent_menu.git
git branch -M main
git push -u origin main
```

---

### Step 4: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **"Settings"** tab
3. Scroll down to **"Pages"** in the left sidebar
4. Under **"Build and deployment"**:
   - **Source**: Select "GitHub Actions"
5. Click **"Save"**

---

### Step 5: Deploy

The site will automatically deploy when you push to the main branch!

**First Deployment:**
1. Go to your repository
2. Click **"Actions"** tab
3. You should see "Deploy to GitHub Pages" workflow running
4. Wait for it to complete (usually 2-3 minutes)
5. Once complete, your site will be live!

**Your site URL will be:**
```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

**Example:**
```
https://ayushmahakalkar.github.io/Resturent_menu/
```

---

## 🔄 Updating Your Site

After making changes:

```bash
# Add changes
git add .

# Commit with a message
git commit -m "Updated menu items"

# Push to GitHub
git push

# Site will automatically rebuild and deploy!
```

---

## ✅ Verification Checklist

Before deploying, make sure:

- [ ] Updated `base` path in `vite.config.ts` with your repo name
- [ ] All menu items are correct
- [ ] Restaurant settings are updated (name, phone, address)
- [ ] Admin password is changed (default: admin123)
- [ ] Images are loading properly
- [ ] Tested locally with `npm run build && npm run preview`

---

## 🛠️ Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Install gh-pages package
npm install --save-dev gh-pages

# Build and deploy
npm run deploy:gh
```

---

## 🎨 Customization Before Deploy

### 1. Update Restaurant Information

Go to: http://localhost:3001/admin/login
- Login: `admin` / `admin123`
- Go to **Settings** tab
- Update:
  - Restaurant name
  - Phone number
  - Email
  - Address
  - Logo URL
  - Hero banner image

### 2. Add All Menu Items

- Go to **Menu Items** tab
- Click **"Add Item"** for each dish
- Fill in details and save

### 3. Change Admin Password

**Important for security!**

Currently, there's no UI to change password. You'll need to:
1. Deploy the site
2. Only share admin URL with trusted staff
3. Consider adding password change feature later

---

## 📱 Testing Production Build Locally

Before deploying, test the production build:

```bash
# Build the project
npm run build

# Preview the build
npm run preview
```

Open the URL shown (usually http://localhost:4173) and test:
- All pages load correctly
- Images display properly
- Admin panel works
- Menu items show up
- Search and filters work

---

## 🔒 Security Considerations

### For Production Deployment:

1. **Change Admin Password**
   - Default password is `admin123`
   - This is stored in `mockAuthAPI` in `src/services/mockApi.ts`
   - Change it before deploying!

2. **Hide Admin Panel** (Optional)
   - Consider removing the admin login link from public pages
   - Share admin URL only with staff: `https://your-site.com/admin/login`

3. **Data Backup**
   - localStorage data is stored in user's browser
   - Export menu data regularly
   - Keep a backup of your menu items

---

## 🐛 Troubleshooting

### Issue: Site shows 404 error

**Solution:**
- Check if `base` path in `vite.config.ts` matches your repo name
- Make sure it has leading and trailing slashes: `'/repo-name/'`

### Issue: Images not loading

**Solution:**
- Use absolute URLs for images (starting with `https://`)
- Test image URLs before adding to menu
- Use image hosting services like Unsplash, Imgur, or Cloudinary

### Issue: Blank page after deployment

**Solution:**
- Check browser console for errors (F12)
- Verify `base` path is correct
- Clear browser cache and reload

### Issue: Changes not showing

**Solution:**
- Wait 2-3 minutes for deployment to complete
- Clear browser cache (Ctrl + Shift + Delete)
- Check Actions tab to see if deployment succeeded

---

## 📊 GitHub Pages Limits

- **Storage**: 1 GB
- **Bandwidth**: 100 GB/month
- **Builds**: 10 per hour
- **File size**: Max 100 MB per file

Your restaurant menu site is well within these limits!

---

## 🎯 Post-Deployment Tasks

After successful deployment:

1. **Test the live site**
   - Open your GitHub Pages URL
   - Test all features
   - Check on mobile devices

2. **Share with team**
   - Customer menu URL: `https://your-site.com/`
   - Admin panel URL: `https://your-site.com/admin/login`

3. **Add custom domain** (Optional)
   - Buy a domain (e.g., patolamenu.com)
   - Configure DNS settings
   - Add CNAME file to repository

4. **Monitor usage**
   - Check GitHub repository insights
   - Monitor for any issues

---

## 🚀 Quick Deploy Commands

```bash
# First time setup
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main

# Future updates
git add .
git commit -m "Updated menu"
git push
```

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review GitHub Actions logs for errors
3. Verify all configuration files are correct

---

## ✨ Your Site is Ready!

Once deployed, your restaurant menu will be live at:
```
https://YOUR_USERNAME.github.io/YOUR_REPO/
```

**Features Available:**
- ✅ Customer-facing menu with categories
- ✅ Search and filter functionality
- ✅ Admin panel for menu management
- ✅ Mobile-responsive design
- ✅ Real-time updates
- ✅ Image support for dishes
- ✅ Compact layout for simple items

**Enjoy your live restaurant menu! 🎉**

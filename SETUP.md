# Panstellia - E-Commerce Website Setup Guide

## Prerequisites

Before you begin, ensure you have:
- Node.js (v18 or higher) installed
- npm or yarn package manager
- A Google account for Firebase
- A Razorpay account for payments

---

## Step 1: Install Dependencies

Navigate to the project directory and install all dependencies:

```bash
cd Panstellia
npm install
```

---

## Step 2: Firebase Setup

### 2.1 Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and enter "Panstellia" as the project name
3. Disable Google Analytics (or enable if you want)
4. Click "Create project" and wait for it to be ready

### 2.2 Enable Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click "Get started"
3. Under "Sign-in method", enable "Email/Password"
4. Set as:
   - Email/Password: Enabled
   - Email link (passwordless sign-in): Disabled
5. Click "Save"

### 2.3 Create Firestore Database

1. Go to **Build → Firestore Database**
2. Click "Create database"
3. Select location (us-central1 recommended)
4. Start in "Test mode" (you can configure rules later)
5. Click "Create"

### 2.4 Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click the web icon (</>) to add a web app
4. Register app as "Panstellia Web"
5. Copy the firebaseConfig object

---

## Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```env
# Firebase Config
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Razorpay (Test Mode)
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id

# API URL (Optional - for production)
VITE_API_URL=https://your-api.com
```

Replace the placeholder values with your actual Firebase configuration.

---

## Step 4: Razorpay Setup

### 4.1 Create Razorpay Account

1. Go to [Razorpay](https://razorpay.com/)
2. Sign up or Sign in
3. Complete KYC verification

### 4.2 Get Key ID

1. In Razorpay Dashboard, go to **Settings → API Keys**
2. Copy the Key ID (starts with `rzp_...`)
3. Use this in your `.env` file as `VITE_RAZORPAY_KEY_ID`

### 4.3 Test Mode

Razorpay provides test keys for development:
- Use test key ID: `rzp_test_...`
- Test cards: Available in Razorpay documentation

---

## Step 5: Run Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

---

## Step 6: Build for Production

```bash
npm run build
```

This creates optimized files in the `dist` folder.

---

## Step 7: Deployment to GoDaddy

### 7.1 Build the Project

```bash
npm run build
```

### 7.2 GoDaddy Hosting Setup

1. Log in to [GoDaddy](https://www.godaddy.com/)
2. Go to **Products → Web Hosting**
3. Select your domain or purchase a new one
4. Choose "Managed WordPress" or "cPanel"

### 7.3 Upload Files

#### Option A: Using cPanel File Manager

1. Log in to cPanel
2. Go to **File Manager → public_html**
3. Upload all files from the `dist` folder
4. Set proper file permissions

#### Option B: Using FTP

1. Get FTP credentials from GoDaddy
2. Connect using FileZilla
3. Upload contents of `dist` to `public_html`

### 7.4 Configure Domain

1. In GoDaddy, point your domain to the hosting
2. DNS may take up to 24-48 hours to propagate

---

## Firestore Security Rules

For production, update your Firestore rules in Firebase Console:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Anyone can read products
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // Users can only read/write their own cart and wishlist
    match /carts/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /wishlist/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can create orders, admin can read all
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow read: if request.auth != null && request.auth.token.admin == true;
    }
  }
}
```

---

## Project Structure

```
panstellia/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── Footer.jsx
│   │   │   ├── Layout.jsx
│   │   │   └── Navbar.jsx
│   │   └── UI/
│   │       └── ProductCard.jsx
│   ├── context/
│   │   ├── AuthContext.jsx
│   │   ├── CartContext.jsx
│   │   ├── ProductContext.jsx
│   │   └── WishlistContext.jsx
│   ├── pages/
│   │   ├── Admin.jsx
│   │   ├── Cart.jsx
│   │   ├── Checkout.jsx
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── OrderSuccess.jsx
│   │   ├── Orders.jsx
│   │   ├── Products.jsx
│   │   ├── ProductDetail.jsx
│   │   ├── Signup.jsx
│   │   └── Wishlist.jsx
│   ├── services/
│   │   ├── firebase.js
│   │   └── payment.js
│   ├── App.jsx
│   ├── index.css
│   └── main.jsx
├── .env (create this)
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vite.config.js
└── SETUP.md
```

---

## Features Included

- ✅ User Authentication (Signup, Login, Logout)
- ✅ Product Catalog with Categories
- ✅ Product Search & Filters
- ✅ Shopping Cart
- ✅ Wishlist
- ✅ Checkout with Razorpay
- ✅ Order Management
- ✅ Admin Panel
- ✅ Responsive Design
- ✅ Premium UI/UX

---

## Troubleshooting

### "Firebase not initialized" error
- Check your `.env` file has correct Firebase config

### Payment not working
- Ensure Razorpay key is set in `.env`
- Use test mode keys for development

### Page not found on refresh
- Configure your server to redirect all routes to index.html

### Styles not loading
- Ensure Tailwind CSS is properly installed
- Run `npm install` again if needed

---

## Support

For issues or questions:
- Email: support@panstellia.com
- Website: https://panstellia.com

# 🚀 Quick Start Guide - 15 Minutes to Launch

## Prerequisites
- Node.js installed (v16+)
- Git installed
- Credit card for Stripe account (won't be charged)

---

## Step 1: Clone & Setup (2 minutes)

```bash
# Create project
mkdir fitness-platform && cd fitness-platform

# Initialize
npm init -y
npx create-react-app frontend

# Install backend dependencies
npm install @supabase/supabase-js stripe openai bcryptjs jsonwebtoken netlify-cli

# Install frontend dependencies  
cd frontend
npm install react-router-dom recharts lucide-react
cd ..
```

---

## Step 2: Supabase Setup (3 minutes)

1. **Create Account**: Go to [supabase.com](https://supabase.com) → Sign up
2. **New Project**: Click "New Project" → Name it "fitness-platform"
3. **Copy Schema**: Once loaded, go to SQL Editor → New Query
4. **Paste & Run**: Copy the database schema from our backend architecture → Run

5. **Get Keys**: Settings → API → Copy these:
   ```
   Project URL: https://xxxxx.supabase.co
   anon key: eyJhbG...
   service_role key: eyJhbG... (keep secret!)
   ```

6. **Create Admin**: SQL Editor → New Query → Run:
   ```sql
   INSERT INTO users (email, username, password_hash, role, is_active)
   VALUES ('admin@fitness.com', 'admin', crypt('admin123', gen_salt('bf')), 'admin', true);
   ```

---

## Step 3: Stripe Setup (5 minutes)

### A. Create Account
1. Go to [stripe.com](https://stripe.com) → Sign up
2. **IMPORTANT**: Stay in **TEST MODE** (toggle in top right)

### B. Get API Keys
Dashboard → Developers → API Keys → Copy:
- Publishable key: `pk_test_...`
- Secret key: `sk_test_...`

### C. Create Products
1. Go to Products → Add Product:
   
   **Basic Plan**:
   - Name: Basic Training
   - Price: $49/month
   - Copy price ID: `price_xxx`
   
   **Premium Plan**:
   - Name: Premium Training  
   - Price: $79/month
   - Copy price ID: `price_xxx`

### D. Setup Webhook (for local testing)
```bash
# Install Stripe CLI (Mac)
brew install stripe/stripe-cli/stripe

# Or download from stripe.com/docs/stripe-cli

# Login
stripe login

# Start webhook forwarding (keep running)
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-payments/webhook
# Copy the webhook secret: whsec_xxx
```

---

## Step 4: Environment Setup (2 minutes)

Create `.env` in root:
```env
# Supabase (from Step 2)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_KEY=eyJhbG...

# JWT
JWT_SECRET=my-super-secret-key-change-this

# Stripe (from Step 3)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC=price_...
STRIPE_PRICE_ID_PREMIUM=price_...

# OpenAI (optional for now)
OPENAI_API_KEY=sk-...

# Site
SITE_URL=http://localhost:8888
```

Create `frontend/.env`:
```env
REACT_APP_API_URL=http://localhost:8888/.netlify/functions
REACT_APP_STRIPE_KEY=pk_test_...
```

---

## Step 5: Create Files (1 minute)

Create `netlify.toml` in root:
```toml
[build]
  functions = "netlify/functions"
  publish = "frontend/build"

[dev]
  port = 8888
  targetPort = 3000
```

Create folders:
```bash
mkdir -p netlify/functions
```

Copy the backend API code into `netlify/functions/`
- auth.js
- stripe-payments.js
- admin-dashboard.js
- client-dashboard.js

---

## Step 6: Test Locally (2 minutes)

### Terminal 1: Stripe Webhooks
```bash
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-payments/webhook
```

### Terminal 2: Start App
```bash
netlify dev
```

This opens http://localhost:8888 automatically

---

## 🎯 Testing Checklist

### 1. Admin Login
- URL: http://localhost:8888
- Username: `admin`
- Password: `admin123`
- ✅ Should see admin dashboard

### 2. Create Test Client
- Click "Add Client" button
- Fill in details
- ✅ Client appears in list

### 3. Test Payment
- Login as client
- Click "Subscribe"
- Use test card: `4242 4242 4242 4242`
- Any future date, any CVC
- ✅ Payment succeeds

### 4. Check Everything Works
- Admin: See revenue update
- Client: See active subscription
- Stripe Dashboard: See test payment

---

## 🚨 Troubleshooting

### "Cannot connect to Supabase"
- Check your URL format: `https://xxxxx.supabase.co`
- Verify keys are copied correctly

### "Stripe checkout fails"
- Ensure using TEST keys (start with `sk_test_`)
- Check products are created in TEST mode

### "Port already in use"
```bash
# Mac/Linux
lsof -ti:8888 | xargs kill
lsof -ti:3000 | xargs kill
```

### "Module not found"
```bash
npm install  # in root
cd frontend && npm install
```

---

## 📱 Test Payment Cards

| Scenario | Card Number | CVC | Date |
|----------|------------|-----|------|
| ✅ Success | 4242 4242 4242 4242 | Any | Future |
| ❌ Declined | 4000 0000 0000 0002 | Any | Future |
| 💳 3D Secure | 4000 0025 0000 3155 | Any | Future |

---

## 🎉 Success Indicators

You know it's working when:
1. ✅ Admin dashboard shows metrics
2. ✅ Client can register/login
3. ✅ Stripe test payment succeeds
4. ✅ Webhook shows in terminal
5. ✅ Client dashboard updates

---

## 🚀 Deploy to Production

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
gh repo create fitness-platform
git push -u origin main
```

### 2. Deploy on Netlify
1. Go to [netlify.com](https://netlify.com)
2. "New site from Git" → Choose repo
3. Add environment variables
4. Deploy!

### 3. Update Stripe
1. Switch to LIVE mode
2. Create real products
3. Update webhook URL to: `https://yoursite.netlify.app/.netlify/functions/stripe-payments/webhook`

---

## 💰 Your First Dollar

1. Share your Netlify URL with a friend
2. Have them sign up and subscribe
3. Watch the revenue roll in!
4. Check Stripe for real payment

**Congratulations! You're now running a fitness platform that rivals Trainerize!** 🎉
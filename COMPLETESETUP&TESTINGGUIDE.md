#!/bin/bash
# =========================================
# COMPLETE SETUP & TESTING GUIDE
# Local Development + Stripe Configuration
# =========================================

# =========================================
# PART 1: PROJECT SETUP
# =========================================

# 1. Create project structure
mkdir fitness-platform
cd fitness-platform

# 2. Initialize backend
mkdir netlify
mkdir netlify/functions
npm init -y

# 3. Install backend dependencies
npm install --save \
  @supabase/supabase-js \
  stripe \
  openai \
  bcryptjs \
  jsonwebtoken \
  @sendgrid/mail

# 4. Install dev dependencies
npm install --save-dev netlify-cli

# 5. Create React frontend
npx create-react-app frontend
cd frontend

# 6. Install frontend dependencies
npm install \
  react-router-dom \
  recharts \
  lucide-react \
  axios

# =========================================
# PART 2: SUPABASE SETUP
# =========================================

# 1. Go to https://supabase.com and create account
# 2. Create new project (remember password!)
# 3. Wait for project to initialize (~2 minutes)

# 4. Run database schema:
# - Go to SQL Editor in Supabase dashboard
# - Copy and paste the entire database schema from our backend architecture
# - Click "Run" to create all tables

# 5. Get your API keys:
# - Go to Settings > API
# - Copy:
#   - Project URL (SUPABASE_URL)
#   - anon public key (SUPABASE_ANON_KEY)  
#   - service_role key (SUPABASE_SERVICE_KEY) - Keep this secret!

# 6. Create admin user manually in SQL editor:
"""
INSERT INTO users (email, username, password_hash, role, is_active)
VALUES (
  'admin@fitness.com',
  'admin',
  crypt('admin123', gen_salt('bf')), -- Change this password!
  'admin',
  true
);

INSERT INTO user_profiles (user_id, first_name, last_name)
SELECT id, 'Trainer', 'Admin' FROM users WHERE email = 'admin@fitness.com';
"""

# =========================================
# PART 3: STRIPE SETUP (TEST MODE)
# =========================================

# 1. Create Stripe account at https://stripe.com
# 2. Stay in TEST MODE (toggle in dashboard)

# 3. Get API Keys:
# - Go to Developers > API Keys
# - Copy:
#   - Publishable key (for frontend - safe to expose)
#   - Secret key (for backend - keep secret!)

# 4. Create Products and Prices:
# - Go to Products > Add Product

# Product 1: Basic Plan
# - Name: Basic Training Plan
# - Price: $49.00
# - Billing: Monthly
# - Copy the price ID (starts with price_)

# Product 2: Premium Plan
# - Name: Premium Training Plan  
# - Price: $79.00
# - Billing: Monthly
# - Copy the price ID

# Product 3: Elite Plan
# - Name: Elite Training Plan
# - Price: $149.00
# - Billing: Monthly
# - Copy the price ID

# 5. Configure Customer Portal:
# - Go to Settings > Billing > Customer Portal
# - Enable: "Allow customers to update payment methods"
# - Enable: "Allow customers to cancel subscriptions"
# - Save changes

# 6. Setup Webhook (for local testing):
# Install Stripe CLI
brew install stripe/stripe-cli/stripe  # Mac
# Or download from: https://stripe.com/docs/stripe-cli

# Login to Stripe
stripe login

# Forward webhooks to local (run this when testing):
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-payments/webhook

# Copy the webhook signing secret that appears!

# =========================================
# PART 4: ENVIRONMENT CONFIGURATION
# =========================================

# Create .env file in root directory
cat > .env << 'EOL'
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJI...
SUPABASE_SERVICE_KEY=eyJhbGciOiJI...

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID_BASIC=price_...
STRIPE_PRICE_ID_PREMIUM=price_...
STRIPE_PRICE_ID_ELITE=price_...

# OpenAI
OPENAI_API_KEY=sk-...

# Site
SITE_URL=http://localhost:8888

# Email (optional for now)
SENDGRID_API_KEY=SG...
EOL

# Create frontend/.env
cat > frontend/.env << 'EOL'
REACT_APP_API_URL=http://localhost:8888/.netlify/functions
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
EOL

# =========================================
# PART 5: CREATE NETLIFY CONFIG
# =========================================

cat > netlify.toml << 'EOL'
[build]
  command = "npm run build"
  functions = "netlify/functions"
  publish = "frontend/build"

[dev]
  command = "npm run dev"
  port = 8888
  targetPort = 3000
  publish = "frontend/build"
  autoLaunch = true

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"
EOL

# =========================================
# PART 6: CREATE PACKAGE.JSON SCRIPTS
# =========================================

# Update root package.json
cat > package.json << 'EOL'
{
  "name": "fitness-platform",
  "version": "1.0.0",
  "scripts": {
    "dev": "netlify dev",
    "dev:backend": "netlify functions:serve",
    "dev:frontend": "cd frontend && npm start",
    "build": "cd frontend && npm run build",
    "deploy": "netlify deploy --prod",
    "stripe:listen": "stripe listen --forward-to localhost:8888/.netlify/functions/stripe-payments/webhook"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "stripe": "^14.10.0",
    "openai": "^4.24.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "netlify-cli": "^17.0.0"
  }
}
EOL

# =========================================
# PART 7: TEST LOCALLY
# =========================================

# Terminal 1: Start Stripe webhook forwarding
stripe listen --forward-to localhost:8888/.netlify/functions/stripe-payments/webhook

# Terminal 2: Start the development server
netlify dev

# This will:
# - Start backend functions on :8888
# - Start React frontend on :3000
# - Proxy API calls correctly
# - Open browser automatically

# =========================================
# PART 8: TESTING CHECKLIST
# =========================================

echo "
===========================================
LOCAL TESTING CHECKLIST
===========================================

1. ADMIN LOGIN TEST:
   - Go to http://localhost:8888
   - Click 'Switch to Admin View' or login
   - Username: admin
   - Password: admin123 (or what you set)
   - ✓ Should see admin dashboard

2. CLIENT REGISTRATION TEST:
   - Click 'Add Client' in admin dashboard
   - Fill in client details
   - ✓ Client should appear in list

3. CLIENT LOGIN TEST:
   - Logout and login as client
   - ✓ Should see client dashboard

4. PAYMENT TEST (Test Mode):
   - As client, click 'Upgrade' or 'Subscribe'
   - Use test card: 4242 4242 4242 4242
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ✓ Should redirect back after payment
   - ✓ Check Stripe dashboard for payment

5. PROGRESS TRACKING TEST:
   - As client, click 'Add Progress'
   - Enter weight, body fat, etc.
   - ✓ Should see updated charts

6. AI FEATURES TEST:
   - Click 'Generate AI Workout'
   - ✓ Should create personalized workout
   - Try AI Coach Chat
   - ✓ Should get responses

7. WEBHOOK TEST:
   - Check terminal running stripe listen
   - ✓ Should see webhook events logged

8. ADMIN METRICS TEST:
   - As admin, check dashboard
   - ✓ Revenue should update after payment
   - ✓ Client count should be accurate
"

# =========================================
# PART 9: COMMON ISSUES & FIXES
# =========================================

echo "
===========================================
COMMON ISSUES & SOLUTIONS
===========================================

ISSUE: 'Cannot connect to Supabase'
FIX: Check your SUPABASE_URL and keys in .env

ISSUE: 'Stripe checkout fails'
FIX: Ensure you're using test keys (sk_test_...)

ISSUE: 'Webhooks not working'
FIX: Make sure stripe listen is running

ISSUE: 'JWT token invalid'
FIX: Clear localStorage and login again

ISSUE: 'CORS errors'
FIX: Check netlify.toml headers configuration

ISSUE: 'Cannot find module'
FIX: Run npm install in both root and frontend/

ISSUE: 'Port already in use'
FIX: Kill process: lsof -ti:8888 | xargs kill
"

# =========================================
# PART 10: DEPLOY TO PRODUCTION
# =========================================

echo "
===========================================
DEPLOYMENT STEPS
===========================================

1. CONNECT TO GITHUB:
   git init
   git add .
   git commit -m 'Initial commit'
   gh repo create fitness-platform --public
   git push -u origin main

2. SETUP NETLIFY:
   - Go to https://netlify.com
   - 'New site from Git'
   - Choose your repository
   - Build settings auto-detected

3. ADD ENVIRONMENT VARIABLES:
   - In Netlify dashboard > Site settings > Environment variables
   - Add all variables from .env (except SITE_URL)
   - Set SITE_URL to your Netlify URL

4. SETUP STRIPE PRODUCTION:
   - Switch to live mode in Stripe
   - Create products with live prices
   - Update webhook endpoint to:
     https://yoursite.netlify.app/.netlify/functions/stripe-payments/webhook
   - Update environment variables with live keys

5. DEPLOY:
   git push  # Auto-deploys via Netlify

6. TEST PRODUCTION:
   - Create test purchase
   - Verify webhook received
   - Check client access
"

# =========================================
# PART 11: STRIPE TEST CARDS
# =========================================

echo "
===========================================
STRIPE TEST CARDS FOR DIFFERENT SCENARIOS
===========================================

SUCCESS SCENARIOS:
4242 4242 4242 4242 - Visa (Success)
5555 5555 5555 4444 - Mastercard (Success)

FAILURE SCENARIOS:
4000 0000 0000 0002 - Card declined
4000 0000 0000 9995 - Insufficient funds
4000 0000 0000 9987 - Lost card
4000 0000 0000 0069 - Expired card

3D SECURE:
4000 0025 0000 3155 - Requires authentication

INTERNATIONAL:
4000 0000 0000 0077 - Canada
4000 0000 0000 1091 - Brazil
"

# =========================================
# PART 12: MONITORING & MAINTENANCE
# =========================================

echo "
===========================================
MONITORING YOUR PLATFORM
===========================================

DAILY CHECKS:
□ Check Stripe dashboard for failed payments
□ Review Netlify function logs for errors
□ Check Supabase dashboard for database size
□ Monitor OpenAI usage (API usage page)

WEEKLY TASKS:
□ Review client engagement metrics
□ Check for cancelled subscriptions
□ Backup database (Supabase > Settings > Backups)
□ Review AI token usage and costs

MONTHLY TASKS:
□ Analyze revenue trends
□ Review and optimize slow queries
□ Update dependencies (npm update)
□ Check Stripe for disputed charges

COST MONITORING:
- Netlify: Check function invocations
- Supabase: Monitor bandwidth and storage
- OpenAI: Track token usage
- Stripe: Review processing fees
"
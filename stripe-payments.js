// =========================================
// COMPLETE BACKEND API - SINGLE TRAINER PLATFORM
// Node.js + Netlify Functions + Stripe + OpenAI
// =========================================

// =========================================
// /netlify/functions/stripe-payments.js
// Complete Stripe Payment Integration
// =========================================
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./utils/auth');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/stripe-payments/', '');
  const method = event.httpMethod;

  try {
    // Create checkout session for new subscription
    if (path === 'create-checkout' && method === 'POST') {
      const user = verifyToken(event.headers.authorization);
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      const { priceId, successUrl, cancelUrl } = JSON.parse(event.body);

      // Get or create Stripe customer
      let customerId;
      const { data: userData } = await supabase
        .from('users')
        .select('stripe_customer_id, email')
        .eq('id', user.userId)
        .single();

      if (userData.stripe_customer_id) {
        customerId = userData.stripe_customer_id;
      } else {
        // Create new Stripe customer
        const customer = await stripe.customers.create({
          email: userData.email,
          metadata: {
            user_id: user.userId
          }
        });
        
        customerId = customer.id;
        
        // Save customer ID to database
        await supabase
          .from('users')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.userId);
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        subscription_data: {
          trial_period_days: 14,
          metadata: {
            user_id: user.userId
          }
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          checkoutUrl: session.url,
          sessionId: session.id 
        })
      };
    }

    // Handle webhook events from Stripe
    if (path === 'webhook' && method === 'POST') {
      const sig = event.headers['stripe-signature'];
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      let stripeEvent;
      
      try {
        stripeEvent = stripe.webhooks.constructEvent(
          event.body,
          sig,
          webhookSecret
        );
      } catch (err) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid signature' })
        };
      }

      // Handle different event types
      switch (stripeEvent.type) {
        case 'checkout.session.completed':
          const session = stripeEvent.data.object;
          
          // Update user subscription status
          await supabase
            .from('users')
            .update({
              stripe_subscription_id: session.subscription,
              subscription_status: 'active',
              subscription_plan: 'premium' // Map based on price
            })
            .eq('stripe_customer_id', session.customer);
          
          break;

        case 'invoice.payment_succeeded':
          const invoice = stripeEvent.data.object;
          
          // Record payment
          await supabase
            .from('payments')
            .insert({
              client_id: invoice.metadata.user_id,
              stripe_invoice_id: invoice.id,
              stripe_charge_id: invoice.charge,
              amount: invoice.amount_paid / 100,
              status: 'succeeded',
              invoice_url: invoice.hosted_invoice_url,
              paid_at: new Date(invoice.status_transitions.paid_at * 1000)
            });
          
          // Update user subscription
          await supabase
            .from('users')
            .update({
              subscription_status: 'active',
              subscription_ends_at: new Date(invoice.lines.data[0].period.end * 1000)
            })
            .eq('stripe_customer_id', invoice.customer);
          
          break;

        case 'invoice.payment_failed':
          const failedInvoice = stripeEvent.data.object;
          
          // Record failed payment
          await supabase
            .from('payments')
            .insert({
              client_id: failedInvoice.metadata.user_id,
              stripe_invoice_id: failedInvoice.id,
              amount: failedInvoice.amount_due / 100,
              status: 'failed',
              failure_reason: failedInvoice.last_payment_error?.message
            });
          
          // Update subscription status
          await supabase
            .from('users')
            .update({ subscription_status: 'past_due' })
            .eq('stripe_customer_id', failedInvoice.customer);
          
          break;

        case 'customer.subscription.deleted':
          const subscription = stripeEvent.data.object;
          
          // Handle subscription cancellation
          await supabase
            .from('users')
            .update({
              subscription_status: 'cancelled',
              subscription_ends_at: new Date(subscription.ended_at * 1000)
            })
            .eq('stripe_customer_id', subscription.customer);
          
          break;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ received: true })
      };
    }

    // Get customer portal link
    if (path === 'customer-portal' && method === 'POST') {
      const user = verifyToken(event.headers.authorization);
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      const { data: userData } = await supabase
        .from('users')
        .select('stripe_customer_id')
        .eq('id', user.userId)
        .single();

      if (!userData.stripe_customer_id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No subscription found' })
        };
      }

      const session = await stripe.billingPortal.sessions.create({
        customer: userData.stripe_customer_id,
        return_url: process.env.SITE_URL + '/dashboard'
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ url: session.url })
      };
    }

    // Get subscription status
    if (path === 'subscription-status' && method === 'GET') {
      const user = verifyToken(event.headers.authorization);
      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      const { data: userData } = await supabase
        .from('users')
        .select('subscription_status, subscription_plan, subscription_ends_at, trial_ends_at')
        .eq('id', user.userId)
        .single();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(userData)
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Stripe error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// =========================================
// /netlify/functions/admin-dashboard.js
// Admin-only endpoints for trainer
// =========================================
const { createClient: createAdminClient } = require('@supabase/supabase-js');
const { verifyToken: verifyAdminToken, requireAdmin } = require('./utils/auth');

const supabaseAdmin = createAdminClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Verify admin authentication
  const user = verifyAdminToken(event.headers.authorization);
  if (!user || !requireAdmin(user)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Admin access required' })
    };
  }

  const path = event.path.replace('/.netlify/functions/admin-dashboard/', '');
  const method = event.httpMethod;

  try {
    // Get dashboard metrics
    if (path === 'metrics' && method === 'GET') {
      // Get current metrics
      const today = new Date();
      const thirtyDaysAgo = new Date(today.setDate(today.getDate() - 30));

      // Total revenue
      const { data: revenue } = await supabaseAdmin
        .from('payments')
        .select('amount')
        .eq('status', 'succeeded')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const totalRevenue = revenue?.reduce((sum, p) => sum + p.amount, 0) || 0;

      // Active clients
      const { data: clients, count: totalClients } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact' })
        .eq('role', 'client')
        .eq('is_active', true);

      const activeClients = clients?.filter(c => 
        c.subscription_status === 'active' || c.subscription_status === 'trialing'
      ).length || 0;

      // Workout completion rate
      const { data: workouts } = await supabaseAdmin
        .from('workouts')
        .select('completed_at')
        .gte('scheduled_date', thirtyDaysAgo.toISOString());

      const completionRate = workouts?.length > 0 
        ? (workouts.filter(w => w.completed_at).length / workouts.length) * 100 
        : 0;

      // Recent activity
      const { data: recentActivity } = await supabaseAdmin
        .from('activity_logs')
        .select(`
          *,
          user:users(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Upcoming sessions
      const { data: upcomingSessions } = await supabaseAdmin
        .from('calendar_events')
        .select(`
          *,
          client:users(first_name, last_name)
        `)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(5);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          metrics: {
            totalRevenue,
            monthlyRecurringRevenue: activeClients * 79, // Average price
            totalClients,
            activeClients,
            completionRate: Math.round(completionRate),
            trialClients: clients?.filter(c => c.subscription_status === 'trialing').length || 0
          },
          recentActivity,
          upcomingSessions
        })
      };
    }

    // Get all clients with details
    if (path === 'clients' && method === 'GET') {
      const { data: clients } = await supabaseAdmin
        .from('users')
        .select(`
          *,
          profile:user_profiles(*),
          last_payment:payments(amount, paid_at),
          workouts:workouts(completed_at)
        `)
        .eq('role', 'client')
        .order('created_at', { ascending: false });

      // Calculate stats for each client
      const clientsWithStats = clients?.map(client => {
        const completedWorkouts = client.workouts?.filter(w => w.completed_at).length || 0;
        const totalWorkouts = client.workouts?.length || 0;
        
        return {
          ...client,
          stats: {
            completedWorkouts,
            totalWorkouts,
            completionRate: totalWorkouts > 0 
              ? Math.round((completedWorkouts / totalWorkouts) * 100) 
              : 0
          }
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(clientsWithStats)
      };
    }

    // Get revenue analytics
    if (path === 'revenue' && method === 'GET') {
      const { period = 'month' } = event.queryStringParameters || {};
      
      let startDate = new Date();
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const { data: payments } = await supabaseAdmin
        .from('payments')
        .select('amount, created_at')
        .eq('status', 'succeeded')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      // Group by day/week/month
      const revenueData = groupRevenueByPeriod(payments, period);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(revenueData)
      };
    }

    // Create new client (admin only)
    if (path === 'create-client' && method === 'POST') {
      const { email, firstName, lastName, plan } = JSON.parse(event.body);

      // Create user account
      const { data: newUser, error } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          username: email.split('@')[0],
          password_hash: await bcrypt.hash(Math.random().toString(36), 10),
          role: 'client',
          subscription_plan: plan || 'trial',
          subscription_status: 'trialing',
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        })
        .select()
        .single();

      if (error) throw error;

      // Create profile
      await supabaseAdmin
        .from('user_profiles')
        .insert({
          user_id: newUser.id,
          first_name: firstName,
          last_name: lastName
        });

      // Send welcome email
      // await sendWelcomeEmail(email, firstName);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newUser)
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Admin error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Helper function to group revenue
function groupRevenueByPeriod(payments, period) {
  const grouped = {};
  
  payments?.forEach(payment => {
    const date = new Date(payment.created_at);
    let key;
    
    if (period === 'week' || period === 'month') {
      key = date.toISOString().split('T')[0]; // Daily
    } else {
      key = `${date.getFullYear()}-${date.getMonth() + 1}`; // Monthly
    }
    
    if (!grouped[key]) {
      grouped[key] = { date: key, revenue: 0, count: 0 };
    }
    
    grouped[key].revenue += payment.amount;
    grouped[key].count += 1;
  });
  
  return Object.values(grouped);
}

// =========================================
// /netlify/functions/client-dashboard.js
// Client-specific endpoints with progress tracking
// =========================================
const { createClient: createClientClient } = require('@supabase/supabase-js');
const { verifyToken: verifyClientToken } = require('./utils/auth');

const supabaseClient = createClientClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const user = verifyClientToken(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  const path = event.path.replace('/.netlify/functions/client-dashboard/', '');
  const method = event.httpMethod;

  try {
    // Get client dashboard data
    if (path === 'overview' && method === 'GET') {
      // Get profile
      const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.userId)
        .single();

      // Get current goals
      const { data: goals } = await supabaseClient
        .from('goals')
        .select('*')
        .eq('client_id', user.userId)
        .eq('status', 'active');

      // Get recent progress
      const { data: progressEntries } = await supabaseClient
        .from('progress_entries')
        .select('*')
        .eq('client_id', user.userId)
        .order('entry_date', { ascending: false })
        .limit(10);

      // Get upcoming workouts
      const { data: upcomingWorkouts } = await supabaseClient
        .from('workouts')
        .select('*')
        .eq('client_id', user.userId)
        .gte('scheduled_date', new Date().toISOString().split('T')[0])
        .is('completed_at', null)
        .order('scheduled_date', { ascending: true })
        .limit(5);

      // Get streaks
      const { data: streaks } = await supabaseClient
        .from('streaks')
        .select('*')
        .eq('client_id', user.userId);

      // Get achievements
      const { data: achievements } = await supabaseClient
        .from('client_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('client_id', user.userId)
        .order('earned_at', { ascending: false })
        .limit(5);

      // Calculate statistics
      const stats = await calculateClientStats(user.userId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          profile,
          goals,
          progressEntries,
          upcomingWorkouts,
          streaks,
          achievements,
          stats
        })
      };
    }

    // Track progress entry
    if (path === 'progress' && method === 'POST') {
      const progressData = JSON.parse(event.body);
      
      // Insert or update progress entry
      const { data: entry, error } = await supabaseClient
        .from('progress_entries')
        .upsert({
          client_id: user.userId,
          entry_date: progressData.date || new Date().toISOString().split('T')[0],
          ...progressData
        })
        .select()
        .single();

      if (error) throw error;

      // Update current weight in profile
      if (progressData.weight_kg) {
        await supabaseClient
          .from('user_profiles')
          .update({ current_weight_kg: progressData.weight_kg })
          .eq('user_id', user.userId);
      }

      // Check for goal achievements
      await checkGoalProgress(user.userId);

      // Check for new achievements
      await checkAchievements(user.userId);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(entry)
      };
    }

    // Get progress chart data
    if (path === 'progress-chart' && method === 'GET') {
      const { period = '3months' } = event.queryStringParameters || {};
      
      let startDate = new Date();
      if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === '3months') {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (period === '6months') {
        startDate.setMonth(startDate.getMonth() - 6);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      const { data: progressData } = await supabaseClient
        .from('progress_entries')
        .select('entry_date, weight_kg, body_fat_percentage, muscle_mass_kg')
        .eq('client_id', user.userId)
        .gte('entry_date', startDate.toISOString().split('T')[0])
        .order('entry_date', { ascending: true });

      // Get workout completion data
      const { data: workoutData } = await supabaseClient
        .from('workouts')
        .select('scheduled_date, completed_at')
        .eq('client_id', user.userId)
        .gte('scheduled_date', startDate.toISOString().split('T')[0])
        .order('scheduled_date', { ascending: true });

      // Format data for charts
      const chartData = formatChartData(progressData, workoutData);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(chartData)
      };
    }

    // Upload progress photos
    if (path === 'upload-photo' && method === 'POST') {
      const { photo_type, photo_base64, date } = JSON.parse(event.body);
      
      // In production, upload to Cloudinary or S3
      // For now, we'll store the base64 (not recommended for production)
      
      const photoField = `${photo_type}_photo_url`;
      
      await supabaseClient
        .from('progress_entries')
        .upsert({
          client_id: user.userId,
          entry_date: date || new Date().toISOString().split('T')[0],
          [photoField]: photo_base64 // In production, this would be the CDN URL
        });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Not found' })
    };

  } catch (error) {
    console.error('Client dashboard error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// Helper functions
async function calculateClientStats(clientId) {
  const { data: stats } = await supabaseClient
    .rpc('get_client_stats', { p_client_id: clientId });
  
  return stats?.[0] || {};
}

async function checkGoalProgress(clientId) {
  const { data: goals } = await supabaseClient
    .from('goals')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'active');

  const { data: latestProgress } = await supabaseClient
    .from('progress_entries')
    .select('*')
    .eq('client_id', clientId)
    .order('entry_date', { ascending: false })
    .limit(1)
    .single();

  for (const goal of goals || []) {
    if (goal.category === 'weight_loss' && latestProgress?.weight_kg) {
      const progress = goal.starting_value - latestProgress.weight_kg;
      await supabaseClient
        .from('goals')
        .update({ 
          current_value: latestProgress.weight_kg,
          status: progress >= goal.target_value ? 'achieved' : 'active',
          achieved_at: progress >= goal.target_value ? new Date() : null
        })
        .eq('id', goal.id);
    }
  }
}

async function checkAchievements(clientId) {
  // Check various achievement criteria
  // This is simplified - in production, you'd have more sophisticated logic
  
  const { data: workoutCount } = await supabaseClient
    .from('workouts')
    .select('id', { count: 'exact' })
    .eq('client_id', clientId)
    .not('completed_at', 'is', null);

  if (workoutCount === 1) {
    // Award "First Workout" achievement
    await supabaseClient
      .from('client_achievements')
      .upsert({
        client_id: clientId,
        achievement_id: 'first-workout-achievement-id'
      });
  }
}

function formatChartData(progressData, workoutData) {
  // Format data for Chart.js
  const weightData = progressData?.map(p => ({
    x: p.entry_date,
    y: p.weight_kg
  })) || [];

  const bodyFatData = progressData?.map(p => ({
    x: p.entry_date,
    y: p.body_fat_percentage
  })) || [];

  const workoutCompletionByWeek = {};
  workoutData?.forEach(w => {
    const week = getWeekNumber(new Date(w.scheduled_date));
    if (!workoutCompletionByWeek[week]) {
      workoutCompletionByWeek[week] = { total: 0, completed: 0 };
    }
    workoutCompletionByWeek[week].total++;
    if (w.completed_at) {
      workoutCompletionByWeek[week].completed++;
    }
  });

  return {
    weightData,
    bodyFatData,
    workoutCompletion: Object.entries(workoutCompletionByWeek).map(([week, data]) => ({
      week,
      rate: (data.completed / data.total) * 100
    }))
  };
}

function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// =========================================
// /netlify/functions/utils/auth.js
// Authentication utilities
// =========================================
const jwt = require('jsonwebtoken');

function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    return null;
  }
}

function requireAdmin(user) {
  return user && user.role === 'admin';
}

module.exports = { verifyToken, requireAdmin };

// =========================================
// package.json
// =========================================
/*
{
  "name": "fitness-platform-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "netlify dev",
    "build": "netlify build",
    "deploy": "netlify deploy --prod"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "stripe": "^14.10.0",
    "openai": "^4.24.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "@sendgrid/mail": "^8.0.0",
    "cloudinary": "^1.41.0"
  },
  "devDependencies": {
    "netlify-cli": "^17.0.0"
  }
}
*/

// =========================================
// .env.example
// =========================================
/*
# Site URL
SITE_URL=https://yoursite.netlify.app

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Authentication
JWT_SECRET=your_jwt_secret_key

# Stripe
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
STRIPE_PRICE_ID_BASIC=price_xxx
STRIPE_PRICE_ID_PREMIUM=price_xxx
STRIPE_PRICE_ID_ELITE=price_xxx

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# SendGrid (for emails)
SENDGRID_API_KEY=your_sendgrid_key

# Cloudinary (for image storage)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
*/

// =========================================
// Stripe Setup Instructions
// =========================================
/*
STRIPE INTEGRATION SETUP:

1. Create Stripe Account:
   - Go to stripe.com and create account
   - Get your API keys from dashboard

2. Create Products and Prices:
   - In Stripe Dashboard, create subscription products:
     * Basic Plan - $49/month
     * Premium Plan - $79/month
     * Elite Plan - $149/month
   - Copy the price IDs for each plan

3. Setup Webhook:
   - In Stripe Dashboard > Webhooks
   - Add endpoint: https://yoursite.netlify.app/.netlify/functions/stripe-payments/webhook
   - Select events:
     * checkout.session.completed
     * invoice.payment_succeeded
     * invoice.payment_failed
     * customer.subscription.deleted
   - Copy the webhook secret

4. Configure Customer Portal:
   - In Stripe Dashboard > Customer Portal
   - Enable and configure self-service options
   - Set return URL to your dashboard

5. Test Mode:
   - Use test API keys for development
   - Test card: 4242 4242 4242 4242
   - Any future date and CVC

6. Going Live:
   - Replace test keys with live keys
   - Update webhook endpoint
   - Test with real payment
*/
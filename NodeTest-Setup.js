// =========================================
// QUICK TESTING SCRIPT
// Run this to verify your setup is working
// Save as: test-setup.js
// Run with: node test-setup.js
// =========================================

const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe');

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

console.log(`${colors.blue}
=========================================
FITNESS PLATFORM SETUP TESTER
=========================================
${colors.reset}`);

// Load environment variables
require('dotenv').config();

// Test results tracker
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// =========================================
// TEST 1: Environment Variables
// =========================================
async function testEnvironmentVariables() {
  console.log('\n📋 Testing Environment Variables...\n');
  
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_KEY',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'OPENAI_API_KEY'
  ];
  
  const optional = [
    'STRIPE_WEBHOOK_SECRET',
    'SENDGRID_API_KEY',
    'SITE_URL'
  ];
  
  // Check required variables
  for (const key of required) {
    if (process.env[key]) {
      console.log(`${colors.green}✓${colors.reset} ${key} is set`);
      results.passed.push(`${key} configured`);
    } else {
      console.log(`${colors.red}✗${colors.reset} ${key} is missing`);
      results.failed.push(`${key} not configured`);
    }
  }
  
  // Check optional variables
  for (const key of optional) {
    if (process.env[key]) {
      console.log(`${colors.green}✓${colors.reset} ${key} is set (optional)`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} ${key} is missing (optional)`);
      results.warnings.push(`${key} not configured (optional)`);
    }
  }
}

// =========================================
// TEST 2: Supabase Connection
// =========================================
async function testSupabaseConnection() {
  console.log('\n🗄️  Testing Supabase Connection...\n');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Try to query users table
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    console.log(`${colors.green}✓${colors.reset} Connected to Supabase successfully`);
    results.passed.push('Supabase connection successful');
    
    // Check if tables exist
    const tables = [
      'users',
      'user_profiles',
      'workouts',
      'progress_entries',
      'payments'
    ];
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('count')
        .limit(1);
      
      if (tableError) {
        console.log(`${colors.red}✗${colors.reset} Table '${table}' not found`);
        results.failed.push(`Table '${table}' missing`);
      } else {
        console.log(`${colors.green}✓${colors.reset} Table '${table}' exists`);
      }
    }
    
    // Check for admin user
    const { data: adminUser } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'admin')
      .single();
    
    if (adminUser) {
      console.log(`${colors.green}✓${colors.reset} Admin user exists: ${adminUser.email}`);
      results.passed.push('Admin user configured');
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} No admin user found - create one first`);
      results.warnings.push('No admin user found');
    }
    
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Supabase connection failed: ${error.message}`);
    results.failed.push(`Supabase: ${error.message}`);
  }
}

// =========================================
// TEST 3: Stripe Connection
// =========================================
async function testStripeConnection() {
  console.log('\n💳 Testing Stripe Connection...\n');
  
  try {
    const stripeClient = stripe(process.env.STRIPE_SECRET_KEY);
    
    // Check if we can retrieve account info
    const account = await stripeClient.accounts.retrieve();
    
    console.log(`${colors.green}✓${colors.reset} Connected to Stripe successfully`);
    console.log(`  Account: ${account.email || 'Not set'}`);
    console.log(`  Mode: ${process.env.STRIPE_SECRET_KEY.startsWith('sk_test') ? 'TEST' : 'LIVE'}`);
    
    if (!process.env.STRIPE_SECRET_KEY.startsWith('sk_test')) {
      console.log(`${colors.yellow}⚠${colors.reset} Using LIVE Stripe keys - be careful!`);
      results.warnings.push('Using LIVE Stripe keys');
    }
    
    results.passed.push('Stripe connection successful');
    
    // Check for products
    const products = await stripeClient.products.list({ limit: 3 });
    
    if (products.data.length > 0) {
      console.log(`${colors.green}✓${colors.reset} Found ${products.data.length} products:`);
      products.data.forEach(product => {
        console.log(`  - ${product.name}`);
      });
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} No products found - create them in Stripe dashboard`);
      results.warnings.push('No Stripe products configured');
    }
    
    // Check for prices
    const prices = await stripeClient.prices.list({ limit: 3 });
    
    if (prices.data.length > 0) {
      console.log(`${colors.green}✓${colors.reset} Found ${prices.data.length} prices:`);
      prices.data.forEach(price => {
        const amount = (price.unit_amount / 100).toFixed(2);
        console.log(`  - ${price.id}: $${amount}/${price.recurring?.interval || 'one-time'}`);
      });
    } else {
      console.log(`${colors.red}✗${colors.reset} No prices found - create them in Stripe dashboard`);
      results.failed.push('No Stripe prices configured');
    }
    
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Stripe connection failed: ${error.message}`);
    results.failed.push(`Stripe: ${error.message}`);
  }
}

// =========================================
// TEST 4: OpenAI Connection
// =========================================
async function testOpenAIConnection() {
  console.log('\n🤖 Testing OpenAI Connection...\n');
  
  try {
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Make a simple test request
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a test assistant." },
        { role: "user", content: "Reply with 'OK' if you're working." }
      ],
      max_tokens: 10
    });
    
    if (completion.choices[0].message.content.includes('OK')) {
      console.log(`${colors.green}✓${colors.reset} OpenAI API is working`);
      console.log(`  Model: gpt-4o-mini`);
      console.log(`  Tokens used: ${completion.usage.total_tokens}`);
      results.passed.push('OpenAI connection successful');
    } else {
      throw new Error('Unexpected response from OpenAI');
    }
    
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} OpenAI connection failed: ${error.message}`);
    results.failed.push(`OpenAI: ${error.message}`);
  }
}

// =========================================
// TEST 5: Local Server Check
// =========================================
async function testLocalServer() {
  console.log('\n🌐 Testing Local Server...\n');
  
  const ports = [
    { port: 8888, name: 'Netlify Functions' },
    { port: 3000, name: 'React Frontend' }
  ];
  
  for (const { port, name } of ports) {
    await new Promise((resolve) => {
      const options = {
        hostname: 'localhost',
        port: port,
        path: '/',
        method: 'GET',
        timeout: 2000
      };
      
      const req = https.request(options, (res) => {
        console.log(`${colors.green}✓${colors.reset} ${name} is running on port ${port}`);
        results.passed.push(`${name} running`);
        resolve();
      });
      
      req.on('error', () => {
        console.log(`${colors.yellow}⚠${colors.reset} ${name} not running on port ${port}`);
        console.log(`  Run: netlify dev`);
        results.warnings.push(`${name} not running`);
        resolve();
      });
      
      req.on('timeout', () => {
        req.destroy();
        console.log(`${colors.yellow}⚠${colors.reset} ${name} timeout on port ${port}`);
        resolve();
      });
      
      req.end();
    });
  }
}

// =========================================
// TEST 6: Database Schema Check
// =========================================
async function testDatabaseSchema() {
  console.log('\n📊 Testing Database Schema...\n');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    // Check for required functions
    const { data: functions, error } = await supabase.rpc('get_client_stats', {
      p_client_id: '00000000-0000-0000-0000-000000000000'
    });
    
    if (error) {
      console.log(`${colors.yellow}⚠${colors.reset} Database functions not found - run full schema`);
      results.warnings.push('Database functions missing');
    } else {
      console.log(`${colors.green}✓${colors.reset} Database functions installed`);
      results.passed.push('Database functions ready');
    }
    
    // Check subscription plans
    const { data: plans } = await supabase
      .from('subscription_plans')
      .select('*');
    
    if (plans && plans.length > 0) {
      console.log(`${colors.green}✓${colors.reset} Found ${plans.length} subscription plans`);
      plans.forEach(plan => {
        console.log(`  - ${plan.name}: $${plan.price_monthly}/mo`);
      });
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} No subscription plans - run seed data`);
      results.warnings.push('No subscription plans in database');
    }
    
  } catch (error) {
    console.log(`${colors.red}✗${colors.reset} Schema check failed: ${error.message}`);
    results.failed.push(`Schema: ${error.message}`);
  }
}

// =========================================
// MAIN TEST RUNNER
// =========================================
async function runAllTests() {
  console.log('Starting tests...\n');
  
  await testEnvironmentVariables();
  await testSupabaseConnection();
  await testStripeConnection();
  await testOpenAIConnection();
  await testLocalServer();
  await testDatabaseSchema();
  
  // Print summary
  console.log(`\n${colors.blue}
=========================================
TEST SUMMARY
=========================================
${colors.reset}`);
  
  console.log(`\n${colors.green}PASSED (${results.passed.length}):${colors.reset}`);
  results.passed.forEach(test => console.log(`  ✓ ${test}`));
  
  if (results.warnings.length > 0) {
    console.log(`\n${colors.yellow}WARNINGS (${results.warnings.length}):${colors.reset}`);
    results.warnings.forEach(warning => console.log(`  ⚠ ${warning}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n${colors.red}FAILED (${results.failed.length}):${colors.reset}`);
    results.failed.forEach(failure => console.log(`  ✗ ${failure}`));
  }
  
  // Overall status
  console.log('\n' + '='.repeat(41));
  if (results.failed.length === 0) {
    console.log(`${colors.green}✅ SETUP IS READY!${colors.reset}`);
    console.log('You can now run: netlify dev');
  } else {
    console.log(`${colors.red}❌ SETUP NEEDS ATTENTION${colors.reset}`);
    console.log('Fix the failed tests above before continuing');
  }
  console.log('='.repeat(41) + '\n');
  
  // Next steps
  console.log('NEXT STEPS:');
  console.log('1. Fix any failed tests above');
  console.log('2. Run: netlify dev');
  console.log('3. Open: http://localhost:8888');
  console.log('4. Login as admin to test');
  console.log('5. Create a test client');
  console.log('6. Test payment with: 4242 4242 4242 4242\n');
}

// Run tests
runAllTests().catch(error => {
  console.error(`${colors.red}Test runner failed: ${error.message}${colors.reset}`);
  process.exit(1);
});

// =========================================
// QUICK FIX COMMANDS
// =========================================

console.log(`
${colors.blue}QUICK FIX COMMANDS:${colors.reset}

If Supabase connection fails:
  - Check SUPABASE_URL format: https://xxxxx.supabase.co
  - Verify keys are correct in .env

If Stripe fails:
  - Ensure using test keys (sk_test_...)
  - Check internet connection

If OpenAI fails:
  - Verify API key starts with 'sk-'
  - Check API credits at platform.openai.com

If local server not running:
  - Run: netlify dev
  - Check ports 3000 and 8888 are free

To create admin user:
  - Run SQL in Supabase dashboard:
    INSERT INTO users (email, username, password_hash, role)
    VALUES ('admin@fitness.com', 'admin', crypt('password123', gen_salt('bf')), 'admin');
`);
// Personal Trainer Backend for Netlify
// Uses Netlify Functions, Supabase for database, and Netlify Blob for storage

// =====================================
// SETUP INSTRUCTIONS
// =====================================
/*
1. Install Netlify CLI: npm install -g netlify-cli
2. Initialize project: netlify init
3. Install dependencies: 
   npm install @supabase/supabase-js @netlify/blobs netlify-lambda jsonwebtoken bcryptjs

4. Environment variables in Netlify:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_KEY
   - JWT_SECRET
   - NETLIFY_BLOBS_CONTEXT

5. Directory structure:
   /netlify/functions/ - All function files go here
   /src/ - Shared utilities
*/

// =====================================
// /netlify/functions/auth-register.js
// =====================================
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, username, password } = JSON.parse(event.body);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'User already exists' })
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          username,
          password_hash: hashedPassword,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    // Generate JWT
    const token = jwt.sign(
      { userId: newUser.id, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        token,
        user: { id: newUser.id, username: newUser.username, email: newUser.email }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// =====================================
// /netlify/functions/auth-login.js
// =====================================
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { username, password } = JSON.parse(event.body);

    // Get user
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error || !user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid credentials' })
      };
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        token,
        user: { id: user.id, username: user.username, email: user.email }
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// =====================================
// /netlify/functions/profile.js
// =====================================
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./utils/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  // Verify authentication
  const user = verifyToken(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    switch (event.httpMethod) {
      case 'GET':
        // Get profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.userId)
          .single();

        return {
          statusCode: 200,
          body: JSON.stringify(profile || {})
        };

      case 'POST':
      case 'PUT':
        // Create or update profile
        const profileData = JSON.parse(event.body);
        
        const { data, error } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: user.userId,
            ...profileData,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 200,
          body: JSON.stringify(data)
        };

      default:
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// =====================================
// /netlify/functions/workouts.js
// =====================================
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./utils/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  const user = verifyToken(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const path = event.path.replace('/.netlify/functions/workouts', '');
    
    switch (event.httpMethod) {
      case 'GET':
        if (path === '/generate') {
          // Generate AI workout
          const profile = await getProfile(user.userId);
          const workout = await generateAIWorkout(profile);
          
          return {
            statusCode: 200,
            body: JSON.stringify(workout)
          };
        } else {
          // Get user's workouts
          const { data: workouts } = await supabase
            .from('workouts')
            .select(`
              *,
              workout_exercises (
                *,
                exercise:exercises (*)
              )
            `)
            .eq('user_id', user.userId)
            .order('created_at', { ascending: false });

          return {
            statusCode: 200,
            body: JSON.stringify(workouts)
          };
        }

      case 'POST':
        // Create workout
        const workoutData = JSON.parse(event.body);
        
        const { data: workout, error } = await supabase
          .from('workouts')
          .insert({
            user_id: user.userId,
            name: workoutData.name,
            scheduled_date: workoutData.scheduled_date,
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        // Add exercises
        if (workoutData.exercises && workoutData.exercises.length > 0) {
          const exerciseData = workoutData.exercises.map((ex, index) => ({
            workout_id: workout.id,
            exercise_id: ex.exercise_id,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            rest_seconds: ex.rest_seconds,
            order: index
          }));

          await supabase
            .from('workout_exercises')
            .insert(exerciseData);
        }

        return {
          statusCode: 201,
          body: JSON.stringify(workout)
        };

      default:
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// AI Workout Generation
async function generateAIWorkout(profile) {
  // This is where you'd integrate with OpenAI, Anthropic, or your custom model
  // For now, returning a template based on profile
  
  const intensityMap = {
    beginner: 0.3,
    intermediate: 0.5,
    advanced: 0.7,
    elite: 0.9
  };

  const intensity = intensityMap[profile.fitness_level] || 0.5;
  
  const workout = {
    name: `AI Generated ${profile.primary_goal} Workout`,
    exercises: []
  };

  // Fetch exercises from database based on goal
  const { data: exercises } = await supabase
    .from('exercises')
    .select('*')
    .limit(5);

  workout.exercises = exercises.map((ex, index) => ({
    exercise_id: ex.id,
    exercise_name: ex.name,
    sets: Math.floor(3 + intensity * 2),
    reps: profile.primary_goal === 'strength' ? '4-6' : '8-12',
    rest_seconds: 60 + (intensity * 30),
    order: index
  }));

  return workout;
}

async function getProfile(userId) {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  return data;
}

// =====================================
// /netlify/functions/progress.js
// =====================================
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./utils/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  const user = verifyToken(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    switch (event.httpMethod) {
      case 'GET':
        // Get progress history
        const { data: progress } = await supabase
          .from('progress')
          .select('*')
          .eq('user_id', user.userId)
          .order('date', { ascending: false });

        // Calculate trends
        const trends = calculateTrends(progress);

        return {
          statusCode: 200,
          body: JSON.stringify({ progress, trends })
        };

      case 'POST':
        // Track new progress
        const progressData = JSON.parse(event.body);
        
        const { data, error } = await supabase
          .from('progress')
          .insert({
            user_id: user.userId,
            ...progressData,
            date: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw error;

        return {
          statusCode: 201,
          body: JSON.stringify(data)
        };

      default:
        return { statusCode: 405, body: 'Method Not Allowed' };
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function calculateTrends(progressData) {
  if (!progressData || progressData.length < 2) return null;

  const latest = progressData[0];
  const previous = progressData[1];
  
  return {
    weight_change: latest.weight - previous.weight,
    body_fat_change: latest.body_fat_percentage - previous.body_fat_percentage,
    trend: latest.weight < previous.weight ? 'losing' : 'gaining'
  };
}

// =====================================
// /netlify/functions/upload-media.js
// =====================================
const { getStore } = require('@netlify/blobs');
const { verifyToken } = require('./utils/auth');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  const user = verifyToken(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { filename, content, type } = JSON.parse(event.body);
    
    // Use Netlify Blobs for storage
    const store = getStore('media');
    
    // Generate unique key
    const key = `${user.userId}/${Date.now()}-${filename}`;
    
    // Store the file
    await store.set(key, content, {
      metadata: { 
        userId: user.userId,
        type: type,
        uploadedAt: new Date().toISOString()
      }
    });

    // Save reference in database
    const { data, error } = await supabase
      .from('media')
      .insert({
        user_id: user.userId,
        key: key,
        filename: filename,
        type: type,
        url: `/.netlify/blobs/${key}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({
        url: data.url,
        key: key
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// =====================================
// /netlify/functions/nutrition.js
// =====================================
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./utils/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async (event, context) => {
  const user = verifyToken(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.userId)
      .single();

    if (!profile) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Profile required' })
      };
    }

    // Calculate nutrition recommendations
    const nutrition = calculateNutrition(profile);

    return {
      statusCode: 200,
      body: JSON.stringify(nutrition)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function calculateNutrition(profile) {
  // Mifflin-St Jeor Equation for BMR
  let bmr;
  if (profile.gender === 'male') {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
  } else {
    bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
  }

  // Activity multiplier
  const activityMultiplier = {
    beginner: 1.2,
    intermediate: 1.375,
    advanced: 1.55,
    elite: 1.725
  };

  const tdee = bmr * (activityMultiplier[profile.fitness_level] || 1.375);

  // Adjust for goals
  let targetCalories = tdee;
  if (profile.primary_goal === 'weight_loss') {
    targetCalories = tdee - 500;
  } else if (profile.primary_goal === 'muscle_gain') {
    targetCalories = tdee + 300;
  }

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target_calories: Math.round(targetCalories),
    macros: {
      protein: Math.round(profile.weight * 2.0), // g
      carbs: Math.round((targetCalories * 0.4) / 4), // g
      fats: Math.round((targetCalories * 0.3) / 9) // g
    },
    water: Math.round(profile.weight * 35), // ml
    meal_timing: {
      pre_workout: 'Carbs + moderate protein 1-2 hours before',
      post_workout: 'Protein + carbs within 30 minutes',
      daily_meals: '4-5 smaller meals'
    }
  };
}

// =====================================
// /netlify/functions/utils/auth.js
// =====================================
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

module.exports = { verifyToken };

// =====================================
// /src/database-schema.sql
// =====================================
/*
-- Run this in Supabase SQL editor to create tables

-- Users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User profiles
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  age INTEGER,
  height DECIMAL(5,2), -- cm
  weight DECIMAL(5,2), -- kg
  gender VARCHAR(20),
  fitness_level VARCHAR(50),
  primary_goal VARCHAR(50),
  injuries JSONB DEFAULT '[]',
  preferences JSONB DEFAULT '{}',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exercises
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  muscle_groups JSONB DEFAULT '[]',
  equipment VARCHAR(100),
  difficulty INTEGER CHECK (difficulty >= 1 AND difficulty <= 5),
  description TEXT,
  instructions TEXT,
  video_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workouts
CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255),
  scheduled_date TIMESTAMP,
  completed BOOLEAN DEFAULT FALSE,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Workout exercises (junction table)
CREATE TABLE workout_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  sets INTEGER,
  reps VARCHAR(20), -- Can be range like "8-12"
  weight DECIMAL(5,2),
  rest_seconds INTEGER,
  order_num INTEGER,
  completed BOOLEAN DEFAULT FALSE
);

-- Progress tracking
CREATE TABLE progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  weight DECIMAL(5,2),
  body_fat_percentage DECIMAL(4,2),
  measurements JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  notes TEXT
);

-- Media storage references
CREATE TABLE media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key VARCHAR(500) UNIQUE NOT NULL,
  filename VARCHAR(255),
  type VARCHAR(50),
  url VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_progress_user_id ON progress(user_id);
CREATE INDEX idx_media_user_id ON media(user_id);
CREATE INDEX idx_exercises_type ON exercises(type);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE media ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (adjust as needed)
CREATE POLICY users_policy ON users FOR ALL USING (auth.uid() = id);
CREATE POLICY profiles_policy ON user_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY workouts_policy ON workouts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY progress_policy ON progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY media_policy ON media FOR ALL USING (auth.uid() = user_id);
*/

// =====================================
// netlify.toml Configuration
// =====================================
/*
[build]
  functions = "netlify/functions"

[functions]
  node_bundler = "esbuild"

[[headers]]
  for = "/api/*"
  [headers.values]
    Access-Control-Allow-Origin = "*"
    Access-Control-Allow-Headers = "Content-Type, Authorization"
    Access-Control-Allow-Methods = "GET, POST, PUT, DELETE, OPTIONS"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[dev]
  port = 8888
*/

// =====================================
// package.json
// =====================================
/*
{
  "name": "personal-trainer-backend",
  "version": "1.0.0",
  "scripts": {
    "dev": "netlify dev",
    "build": "netlify deploy --prod"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@netlify/blobs": "^7.0.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2"
  },
  "devDependencies": {
    "netlify-cli": "^17.0.0"
  }
}
*/
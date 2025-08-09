// Personal Trainer Backend with OpenAI Integration
// Leverages OpenAI for all AI-powered features

// =====================================
// SETUP INSTRUCTIONS
// =====================================
/*
1. Get OpenAI API Key from platform.openai.com
2. Install dependencies:
   npm install openai @supabase/supabase-js @netlify/blobs jsonwebtoken bcryptjs

3. Environment variables in Netlify:
   - OPENAI_API_KEY
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - JWT_SECRET

4. Estimated OpenAI Costs:
   - GPT-4o-mini: ~$0.15 per 1M input tokens, $0.60 per 1M output tokens
   - GPT-4o: ~$5 per 1M input tokens, $15 per 1M output tokens
   - Average user might cost $0.10-0.50/month with GPT-4o-mini
*/

// =====================================
// /netlify/functions/ai-workout-generator.js
// =====================================
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./utils/auth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.userId)
      .single();

    // Get user's recent workouts for context
    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get available exercises from database
    const { data: exercises } = await supabase
      .from('exercises')
      .select('id, name, type, muscle_groups, equipment, difficulty');

    const { duration = 45, focus = 'full_body', equipment_available = 'gym' } = JSON.parse(event.body);

    // Create prompt for OpenAI
    const systemPrompt = `You are an expert personal trainer AI. Generate personalized workout plans based on user profiles and goals.
    
Available exercises in our database:
${JSON.stringify(exercises, null, 2)}

Return workout in this exact JSON format:
{
  "name": "Workout name",
  "description": "Brief description",
  "warmup": ["warmup exercise 1", "warmup exercise 2"],
  "exercises": [
    {
      "exercise_id": "uuid from available exercises",
      "exercise_name": "name for reference",
      "sets": 3,
      "reps": "8-12",
      "weight_guidance": "Start with X kg/lbs",
      "rest_seconds": 60,
      "form_cues": ["cue 1", "cue 2"],
      "modifications": {
        "easier": "modification for beginners",
        "harder": "modification for advanced"
      }
    }
  ],
  "cooldown": ["cooldown exercise 1", "cooldown exercise 2"],
  "estimated_calories": 300,
  "tips": ["tip 1", "tip 2"]
}`;

    const userPrompt = `Create a ${duration}-minute ${focus} workout for:
- Age: ${profile.age}
- Weight: ${profile.weight}kg
- Height: ${profile.height}cm
- Fitness Level: ${profile.fitness_level}
- Primary Goal: ${profile.primary_goal}
- Available Equipment: ${equipment_available}
- Injuries/Limitations: ${profile.injuries || 'None'}

Recent workout history: ${recentWorkouts?.map(w => w.name).join(', ') || 'No previous workouts'}

Requirements:
1. Use ONLY exercises from the available exercises list
2. Match difficulty to fitness level
3. Avoid exercises that might aggravate mentioned injuries
4. Progressive overload from recent workouts if applicable
5. Include variety to prevent boredom`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Use gpt-4o for better quality
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const workout = JSON.parse(completion.choices[0].message.content);

    // Save workout to database
    const { data: savedWorkout, error } = await supabase
      .from('workouts')
      .insert({
        user_id: user.userId,
        name: workout.name,
        description: workout.description,
        ai_generated: true,
        scheduled_date: new Date().toISOString(),
        metadata: {
          warmup: workout.warmup,
          cooldown: workout.cooldown,
          estimated_calories: workout.estimated_calories,
          tips: workout.tips
        }
      })
      .select()
      .single();

    if (error) throw error;

    // Save workout exercises
    const exerciseData = workout.exercises.map((ex, index) => ({
      workout_id: savedWorkout.id,
      exercise_id: ex.exercise_id,
      sets: ex.sets,
      reps: ex.reps,
      weight_guidance: ex.weight_guidance,
      rest_seconds: ex.rest_seconds,
      order_num: index,
      form_cues: ex.form_cues,
      modifications: ex.modifications
    }));

    await supabase
      .from('workout_exercises')
      .insert(exerciseData);

    // Log token usage for cost tracking
    await supabase
      .from('ai_usage_logs')
      .insert({
        user_id: user.userId,
        function_name: 'workout_generator',
        tokens_used: completion.usage.total_tokens,
        model: 'gpt-4o-mini',
        cost: calculateCost(completion.usage)
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        workout: { ...savedWorkout, exercises: workout.exercises },
        tokens_used: completion.usage.total_tokens
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function calculateCost(usage) {
  // GPT-4o-mini pricing
  const inputCost = (usage.prompt_tokens / 1000000) * 0.15;
  const outputCost = (usage.completion_tokens / 1000000) * 0.60;
  return inputCost + outputCost;
}

// =====================================
// /netlify/functions/ai-form-check.js
// =====================================
const OpenAI = require('openai');
const { verifyToken } = require('./utils/auth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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
    const { image_base64, exercise_name } = JSON.parse(event.body);

    // Use GPT-4 Vision to analyze form
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert personal trainer analyzing exercise form. 
          Provide specific, actionable feedback on the user's form for ${exercise_name}.
          Be encouraging but point out any issues that could lead to injury.`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: `Please analyze my form for ${exercise_name}. What am I doing well and what should I improve?` 
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${image_base64}`,
                detail: "high"
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    const analysis = response.choices[0].message.content;

    // Parse the analysis into structured feedback
    const structuredFeedback = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Convert the form analysis into structured JSON feedback."
        },
        {
          role: "user",
          content: `Convert this analysis into JSON format:
          ${analysis}
          
          Format:
          {
            "overall_score": 1-10,
            "doing_well": ["point 1", "point 2"],
            "needs_improvement": ["point 1", "point 2"],
            "injury_risks": ["risk 1"],
            "key_correction": "Most important fix",
            "encouragement": "Motivational message"
          }`
        }
      ],
      response_format: { type: "json_object" }
    });

    const feedback = JSON.parse(structuredFeedback.choices[0].message.content);

    return {
      statusCode: 200,
      body: JSON.stringify({
        feedback,
        detailed_analysis: analysis
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// =====================================
// /netlify/functions/ai-nutrition-plan.js
// =====================================
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./utils/auth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
    // Get user profile and recent progress
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.userId)
      .single();

    const { data: recentProgress } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.userId)
      .order('date', { ascending: false })
      .limit(7);

    const { 
      dietary_preferences = [],
      allergies = [],
      meal_prep_time = 'moderate',
      budget = 'moderate'
    } = JSON.parse(event.body || '{}');

    const systemPrompt = `You are a certified nutritionist AI creating personalized meal plans.
    Consider the user's fitness goals, dietary restrictions, and preferences.
    
    Return a detailed nutrition plan in JSON format:
    {
      "daily_calories": 2000,
      "macros": {
        "protein_g": 150,
        "carbs_g": 200,
        "fats_g": 70,
        "fiber_g": 30
      },
      "meal_timing": {
        "breakfast": "7:00 AM",
        "snack_1": "10:00 AM",
        "lunch": "12:30 PM",
        "pre_workout": "3:30 PM",
        "post_workout": "5:30 PM",
        "dinner": "7:00 PM"
      },
      "weekly_meal_plan": {
        "monday": {
          "breakfast": {
            "name": "Meal name",
            "ingredients": ["ingredient 1", "ingredient 2"],
            "calories": 400,
            "protein": 30,
            "prep_time": "10 min",
            "recipe": "Brief instructions"
          },
          "lunch": {},
          "dinner": {},
          "snacks": []
        }
      },
      "shopping_list": {
        "proteins": ["chicken breast - 2 lbs", "eggs - 2 dozen"],
        "carbs": ["rice - 2 lbs", "oats - 1 lb"],
        "vegetables": ["broccoli - 2 heads"],
        "fats": ["almonds - 1 lb"],
        "other": ["protein powder - 1 container"]
      },
      "meal_prep_guide": ["Step 1", "Step 2"],
      "supplement_recommendations": [
        {
          "name": "Creatine",
          "dosage": "5g daily",
          "timing": "Post-workout",
          "reason": "Improves strength and muscle gain"
        }
      ],
      "hydration": "3.5 liters per day",
      "tips": ["Tip 1", "Tip 2"]
    }`;

    const userPrompt = `Create a comprehensive nutrition plan for:
    
Profile:
- Age: ${profile.age}, Weight: ${profile.weight}kg, Height: ${profile.height}cm
- Fitness Level: ${profile.fitness_level}
- Primary Goal: ${profile.primary_goal}
- Dietary Preferences: ${dietary_preferences.join(', ') || 'None'}
- Allergies: ${allergies.join(', ') || 'None'}
- Meal Prep Time Available: ${meal_prep_time}
- Budget: ${budget}

Recent Progress Trend: ${analyzeProgressTrend(recentProgress)}

Requirements:
1. Calculate accurate calories and macros for their goal
2. Create practical, tasty meals they'll actually eat
3. Consider their time and budget constraints
4. Include variety to prevent boredom
5. Account for pre/post workout nutrition
6. Suggest evidence-based supplements only`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    const nutritionPlan = JSON.parse(completion.choices[0].message.content);

    // Save nutrition plan to database
    await supabase
      .from('nutrition_plans')
      .insert({
        user_id: user.userId,
        plan: nutritionPlan,
        created_at: new Date().toISOString(),
        active: true
      });

    return {
      statusCode: 200,
      body: JSON.stringify(nutritionPlan)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function analyzeProgressTrend(progress) {
  if (!progress || progress.length < 2) return 'No recent data';
  
  const weightChange = progress[0].weight - progress[progress.length - 1].weight;
  if (weightChange > 1) return 'Gaining weight';
  if (weightChange < -1) return 'Losing weight';
  return 'Maintaining weight';
}

// =====================================
// /netlify/functions/ai-coach-chat.js
// =====================================
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./utils/auth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
    const { message, conversation_id } = JSON.parse(event.body);

    // Get user context
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.userId)
      .single();

    const { data: recentWorkouts } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: false })
      .limit(3);

    const { data: recentProgress } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.userId)
      .order('date', { ascending: false })
      .limit(1);

    // Get conversation history
    const { data: history } = await supabase
      .from('chat_history')
      .select('*')
      .eq('conversation_id', conversation_id || 'default')
      .eq('user_id', user.userId)
      .order('created_at', { ascending: true })
      .limit(10);

    // Build conversation context
    const messages = [
      {
        role: "system",
        content: `You are an expert personal trainer and health coach. 
        You're knowledgeable, motivating, and empathetic. You provide evidence-based advice.
        
User Profile:
- Fitness Level: ${profile.fitness_level}
- Primary Goal: ${profile.primary_goal}
- Age: ${profile.age}, Weight: ${profile.weight}kg
- Recent Workouts: ${recentWorkouts?.map(w => w.name).join(', ') || 'None yet'}
- Current Weight Trend: ${recentProgress?.[0]?.weight || 'No data'}

Guidelines:
1. Be encouraging and supportive
2. Provide specific, actionable advice
3. Ask clarifying questions when needed
4. Reference their goals and progress
5. Suggest modifications for injuries: ${profile.injuries || 'None'}
6. Keep responses concise but helpful`
      }
    ];

    // Add conversation history
    if (history && history.length > 0) {
      history.forEach(h => {
        messages.push({ role: h.role, content: h.content });
      });
    }

    // Add current message
    messages.push({ role: "user", content: message });

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.8,
      max_tokens: 500
    });

    const aiResponse = completion.choices[0].message.content;

    // Save to chat history
    const conversationId = conversation_id || `conv_${Date.now()}`;
    
    // Save user message
    await supabase
      .from('chat_history')
      .insert({
        user_id: user.userId,
        conversation_id: conversationId,
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      });

    // Save AI response
    await supabase
      .from('chat_history')
      .insert({
        user_id: user.userId,
        conversation_id: conversationId,
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString()
      });

    return {
      statusCode: 200,
      body: JSON.stringify({
        response: aiResponse,
        conversation_id: conversationId
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// =====================================
// /netlify/functions/ai-progress-insights.js
// =====================================
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const { verifyToken } = require('./utils/auth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
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
    // Get comprehensive user data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.userId)
      .single();

    const { data: progressHistory } = await supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.userId)
      .order('date', { ascending: true });

    const { data: workoutHistory } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.userId)
      .eq('completed', true)
      .order('created_at', { ascending: true });

    const systemPrompt = `You are a data-driven fitness analyst providing insights and predictions.
    Analyze the user's progress and provide actionable insights.
    
    Return analysis in JSON format:
    {
      "summary": "Executive summary of progress",
      "metrics": {
        "weight_change_total": -5.2,
        "weight_change_weekly_avg": -0.5,
        "body_fat_change": -2.1,
        "workout_consistency": 85,
        "strength_improvement": 15
      },
      "trends": {
        "positive": ["Consistent workout schedule", "Progressive overload achieved"],
        "concerns": ["Plateau in weight loss", "Decreased workout frequency"]
      },
      "predictions": {
        "goal_achievement_date": "2024-06-15",
        "predicted_weight_4_weeks": 75.5,
        "confidence_score": 0.82
      },
      "recommendations": [
        {
          "priority": "high",
          "category": "nutrition",
          "action": "Reduce calories by 200",
          "reasoning": "Weight loss has plateaued for 2 weeks"
        }
      ],
      "motivational_message": "Personalized encouragement",
      "milestone_alerts": ["5kg lost!", "10 workouts completed!"]
    }`;

    const userPrompt = `Analyze fitness progress for:
    
Profile:
- Starting Weight: ${progressHistory?.[0]?.weight || profile.weight}kg
- Current Weight: ${progressHistory?.[progressHistory.length - 1]?.weight || profile.weight}kg
- Goal: ${profile.primary_goal}
- Fitness Level: ${profile.fitness_level}
- Time Period: ${progressHistory?.length || 0} progress entries

Progress Data:
${JSON.stringify(progressHistory?.slice(-10), null, 2)}

Workout History:
- Total Workouts: ${workoutHistory?.length || 0}
- Recent Frequency: ${calculateWorkoutFrequency(workoutHistory)}

Provide:
1. Honest assessment of progress
2. Data-driven predictions
3. Specific, actionable recommendations
4. Identify patterns and plateaus
5. Celebrate achievements
6. Address concerns constructively`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.6,
      response_format: { type: "json_object" }
    });

    const insights = JSON.parse(completion.choices[0].message.content);

    // Save insights for future reference
    await supabase
      .from('progress_insights')
      .insert({
        user_id: user.userId,
        insights: insights,
        created_at: new Date().toISOString()
      });

    return {
      statusCode: 200,
      body: JSON.stringify(insights)
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function calculateWorkoutFrequency(workouts) {
  if (!workouts || workouts.length === 0) return 'No workouts yet';
  
  const lastMonth = workouts.filter(w => {
    const workoutDate = new Date(w.created_at);
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    return workoutDate > monthAgo;
  });
  
  return `${lastMonth.length} workouts in last 30 days`;
}

// =====================================
// /netlify/functions/ai-injury-prevention.js
// =====================================
const OpenAI = require('openai');
const { verifyToken } = require('./utils/auth');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

exports.handler = async (event, context) => {
  const user = verifyToken(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const { 
      symptoms, 
      location, 
      severity, 
      when_occurs,
      recent_changes 
    } = JSON.parse(event.body);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a sports medicine expert providing injury prevention advice.
          IMPORTANT: Always recommend seeing a healthcare professional for persistent pain.
          Never diagnose conditions, only provide general guidance and prevention strategies.`
        },
        {
          role: "user",
          content: `I'm experiencing:
          - Symptoms: ${symptoms}
          - Location: ${location}
          - Severity (1-10): ${severity}
          - Occurs: ${when_occurs}
          - Recent changes: ${recent_changes}
          
          Provide injury prevention advice and modifications.`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7
    });

    const advice = JSON.parse(completion.choices[0].message.content);

    return {
      statusCode: 200,
      body: JSON.stringify(advice)
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

// =====================================
// Database Schema Updates for OpenAI Integration
// =====================================
/*
-- Additional tables for OpenAI integration

-- AI usage tracking for cost monitoring
CREATE TABLE ai_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  function_name VARCHAR(100),
  model VARCHAR(50),
  tokens_used INTEGER,
  cost DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Chat history for coach conversations
CREATE TABLE chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  conversation_id VARCHAR(100),
  role VARCHAR(20), -- 'user' or 'assistant'
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Nutrition plans
CREATE TABLE nutrition_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Progress insights
CREATE TABLE progress_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  insights JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_chat_history_user_conversation ON chat_history(user_id, conversation_id);
CREATE INDEX idx_ai_usage_user ON ai_usage_logs(user_id);
CREATE INDEX idx_nutrition_plans_user ON nutrition_plans(user_id);
*/

// =====================================
// Frontend Integration Example
// =====================================
/*
// Example React component for workout generation

import { useState } from 'react';

function WorkoutGenerator() {
  const [loading, setLoading] = useState(false);
  const [workout, setWorkout] = useState(null);

  const generateWorkout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/ai-workout-generator', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          duration: 45,
          focus: 'upper_body',
          equipment_available: 'dumbbells'
        })
      });
      
      const data = await response.json();
      setWorkout(data.workout);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={generateWorkout} disabled={loading}>
        {loading ? 'Generating...' : 'Generate AI Workout'}
      </button>
      
      {workout && (
        <div>
          <h2>{workout.name}</h2>
          <p>{workout.description}</p>
          {workout.exercises.map((ex, i) => (
            <div key={i}>
              <h3>{ex.exercise_name}</h3>
              <p>{ex.sets} sets × {ex.reps} reps</p>
              <p>Rest: {ex.rest_seconds}s</p>
              <ul>
                {ex.form_cues.map((cue, j) => (
                  <li key={j}>{cue}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
*/

// =====================================
// Cost Optimization Strategies
// =====================================
/*
COST MANAGEMENT TIPS:

1. Use GPT-4o-mini for most tasks ($0.15/1M tokens vs $5 for GPT-4o)
2. Cache responses in Supabase for common queries
3. Implement rate limiting per user
4. Use streaming for chat responses to show progress
5. Batch similar requests when possible

ESTIMATED COSTS PER USER/MONTH:
- Light usage (10 workouts, 20 chats): $0.10-0.20
- Medium usage (20 workouts, 50 chats): $0.30-0.50  
- Heavy usage (50 workouts, 100 chats): $0.75-1.00

With GPT-4o instead of GPT-4o-mini, multiply costs by ~30x

MONETIZATION SUGGESTIONS:
- Free tier: 5 AI workouts/month with GPT-4o-mini
- Pro tier ($9.99/month): Unlimited GPT-4o-mini
- Elite tier ($29.99/month): GPT-4o for better quality
*/
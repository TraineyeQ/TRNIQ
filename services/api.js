// =========================================
// FRONTEND API INTEGRATION LAYER
// Connects React Frontend to Backend APIs
// =========================================

// =========================================
// /src/services/api.js
// Core API configuration and utilities
// =========================================

const API_BASE_URL = process.env.REACT_APP_API_URL || '/.netlify/functions';

class ApiService {
  constructor() {
    this.token = localStorage.getItem('authToken');
  }

  // Set authorization token
  setAuthToken(token) {
    this.token = token;
    localStorage.setItem('authToken', token);
  }

  // Clear authorization
  logout() {
    this.token = null;
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    window.location.href = '/login';
  }

  // Base fetch wrapper with auth
  async fetchWithAuth(url, options = {}) {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': this.token ? `Bearer ${this.token}` : '',
        ...options.headers
      }
    });

    if (response.status === 401) {
      this.logout();
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  }

  // GET request
  async get(url) {
    return this.fetchWithAuth(url, { method: 'GET' });
  }

  // POST request
  async post(url, data) {
    return this.fetchWithAuth(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // PUT request
  async put(url, data) {
    return this.fetchWithAuth(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // DELETE request
  async delete(url) {
    return this.fetchWithAuth(url, { method: 'DELETE' });
  }
}

export const api = new ApiService();

// =========================================
// /src/services/auth.service.js
// Authentication services
// =========================================

export class AuthService {
  // Admin login
  static async adminLogin(username, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();
      
      if (data.token) {
        api.setAuthToken(data.token);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userData', JSON.stringify(data.user));
        return data;
      }
      
      throw new Error(data.error || 'Login failed');
    } catch (error) {
      throw error;
    }
  }

  // Client login
  static async clientLogin(username, password) {
    return this.adminLogin(username, password); // Same endpoint, role determined by backend
  }

  // Register new client
  static async registerClient(clientData) {
    const response = await api.post('/auth/register', {
      ...clientData,
      role: 'client'
    });
    return response;
  }

  // Get current user
  static getCurrentUser() {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  // Check if admin
  static isAdmin() {
    return localStorage.getItem('userRole') === 'admin';
  }

  // Logout
  static logout() {
    api.logout();
  }
}

// =========================================
// /src/services/stripe.service.js
// Stripe payment integration
// =========================================

export class StripeService {
  // Create checkout session
  static async createCheckout(priceId, successUrl, cancelUrl) {
    const response = await api.post('/stripe-payments/create-checkout', {
      priceId,
      successUrl: successUrl || `${window.location.origin}/payment-success`,
      cancelUrl: cancelUrl || `${window.location.origin}/pricing`
    });
    
    // Redirect to Stripe Checkout
    if (response.checkoutUrl) {
      window.location.href = response.checkoutUrl;
    }
    
    return response;
  }

  // Get customer portal link
  static async getCustomerPortal() {
    const response = await api.post('/stripe-payments/customer-portal');
    
    if (response.url) {
      window.location.href = response.url;
    }
    
    return response;
  }

  // Get subscription status
  static async getSubscriptionStatus() {
    return api.get('/stripe-payments/subscription-status');
  }

  // Cancel subscription
  static async cancelSubscription() {
    // Handled through customer portal
    return this.getCustomerPortal();
  }
}

// =========================================
// /src/services/admin.service.js
// Admin (Trainer) specific services
// =========================================

export class AdminService {
  // Get dashboard metrics
  static async getDashboardMetrics() {
    return api.get('/admin-dashboard/metrics');
  }

  // Get all clients
  static async getAllClients() {
    return api.get('/admin-dashboard/clients');
  }

  // Get revenue analytics
  static async getRevenueAnalytics(period = 'month') {
    return api.get(`/admin-dashboard/revenue?period=${period}`);
  }

  // Create new client
  static async createClient(clientData) {
    return api.post('/admin-dashboard/create-client', clientData);
  }

  // Get client details
  static async getClientDetails(clientId) {
    return api.get(`/admin-dashboard/client/${clientId}`);
  }

  // Update client subscription
  static async updateClientSubscription(clientId, plan) {
    return api.put(`/admin-dashboard/client/${clientId}/subscription`, { plan });
  }

  // Send message to client
  static async sendMessage(clientId, message) {
    return api.post('/messages', {
      recipient_id: clientId,
      content: message
    });
  }

  // Get upcoming sessions
  static async getUpcomingSessions() {
    return api.get('/calendar/upcoming');
  }

  // Get activity logs
  static async getActivityLogs(limit = 50) {
    return api.get(`/admin-dashboard/activity?limit=${limit}`);
  }
}

// =========================================
// /src/services/client.service.js
// Client specific services
// =========================================

export class ClientService {
  // Get client dashboard overview
  static async getDashboard() {
    return api.get('/client-dashboard/overview');
  }

  // Submit progress entry
  static async submitProgress(progressData) {
    return api.post('/client-dashboard/progress', progressData);
  }

  // Get progress chart data
  static async getProgressChart(period = '3months') {
    return api.get(`/client-dashboard/progress-chart?period=${period}`);
  }

  // Upload progress photo
  static async uploadProgressPhoto(photoType, photoBase64, date) {
    return api.post('/client-dashboard/upload-photo', {
      photo_type: photoType,
      photo_base64: photoBase64,
      date
    });
  }

  // Get workouts
  static async getWorkouts() {
    return api.get('/workouts');
  }

  // Complete workout
  static async completeWorkout(workoutId, data) {
    return api.put(`/workouts/${workoutId}/complete`, data);
  }

  // Get nutrition plan
  static async getNutritionPlan() {
    return api.get('/nutrition/plan');
  }

  // Log nutrition
  static async logNutrition(nutritionData) {
    return api.post('/nutrition/log', nutritionData);
  }

  // Get achievements
  static async getAchievements() {
    return api.get('/achievements');
  }

  // Get messages
  static async getMessages() {
    return api.get('/messages');
  }

  // Send message to trainer
  static async sendMessage(message) {
    return api.post('/messages', {
      content: message,
      recipient_role: 'admin'
    });
  }
}

// =========================================
// /src/services/ai.service.js
// AI Coach integration
// =========================================

export class AIService {
  // Generate AI workout
  static async generateWorkout(params) {
    return api.post('/ai-coach/generate-workout', params);
  }

  // Check form with AI
  static async checkForm(exerciseName, imageBase64) {
    return api.post('/ai-coach/check-form', {
      exercise_name: exerciseName,
      image_base64: imageBase64
    });
  }

  // Chat with AI coach
  static async sendChatMessage(message, conversationId) {
    return api.post('/ai-coach/chat', {
      message,
      conversation_id: conversationId
    });
  }

  // Get AI nutrition plan
  static async generateNutritionPlan(preferences) {
    return api.post('/ai-coach/nutrition-plan', preferences);
  }
}

// =========================================
// /src/hooks/useApi.js
// Custom React hooks for API calls
// =========================================

import { useState, useEffect, useCallback } from 'react';

// Generic API hook
export function useApi(apiCall, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// Admin dashboard hook
export function useAdminDashboard() {
  return useApi(() => AdminService.getDashboardMetrics());
}

// Client dashboard hook
export function useClientDashboard() {
  return useApi(() => ClientService.getDashboard());
}

// Progress chart hook
export function useProgressChart(period) {
  return useApi(() => ClientService.getProgressChart(period), [period]);
}

// Subscription status hook
export function useSubscriptionStatus() {
  return useApi(() => StripeService.getSubscriptionStatus());
}

// =========================================
// /src/components/AdminDashboard.jsx
// Updated Admin Dashboard with API integration
// =========================================

import React, { useState, useEffect } from 'react';
import { useAdminDashboard } from '../hooks/useApi';
import { AdminService } from '../services/admin.service';
import { StripeService } from '../services/stripe.service';

export function AdminDashboard() {
  const { data, loading, error, refetch } = useAdminDashboard();
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [revenueData, setRevenueData] = useState([]);

  useEffect(() => {
    loadRevenueData();
  }, [selectedPeriod]);

  const loadRevenueData = async () => {
    try {
      const revenue = await AdminService.getRevenueAnalytics(selectedPeriod);
      setRevenueData(revenue);
    } catch (err) {
      console.error('Failed to load revenue data:', err);
    }
  };

  const handleCreateClient = async () => {
    // Open modal or navigate to client creation form
    // After creation, refetch dashboard data
    await refetch();
  };

  const handleViewPayments = () => {
    // Navigate to payments view or open Stripe dashboard
    window.open('https://dashboard.stripe.com/payments', '_blank');
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="space-x-2">
          <button
            onClick={handleViewPayments}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            View Payments
          </button>
          <button
            onClick={handleCreateClient}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Add Client
          </button>
        </div>
      </div>

      {/* Display metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Total Revenue</h3>
          <p className="text-2xl font-bold">${data?.metrics?.totalRevenue || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Active Clients</h3>
          <p className="text-2xl font-bold">{data?.metrics?.activeClients || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">MRR</h3>
          <p className="text-2xl font-bold">${data?.metrics?.monthlyRecurringRevenue || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Completion Rate</h3>
          <p className="text-2xl font-bold">{data?.metrics?.completionRate || 0}%</p>
        </div>
      </div>

      {/* Revenue chart would go here using revenueData */}
      
      {/* Recent activity */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {data?.recentActivity?.map((activity, index) => (
            <div key={index} className="flex justify-between p-2 hover:bg-gray-50">
              <span>{activity.user?.first_name} {activity.user?.last_name}</span>
              <span>{activity.action}</span>
              <span className="text-gray-500">{new Date(activity.created_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========================================
// /src/components/ClientDashboard.jsx
// Updated Client Dashboard with API integration
// =========================================

import React, { useState } from 'react';
import { useClientDashboard, useProgressChart } from '../hooks/useApi';
import { ClientService } from '../services/client.service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function ClientDashboard() {
  const { data, loading, error, refetch } = useClientDashboard();
  const [chartPeriod, setChartPeriod] = useState('3months');
  const { data: chartData } = useProgressChart(chartPeriod);

  const handleProgressSubmit = async (progressData) => {
    try {
      await ClientService.submitProgress(progressData);
      await refetch(); // Reload dashboard data
    } catch (err) {
      console.error('Failed to submit progress:', err);
    }
  };

  const handlePhotoUpload = async (photoType, file) => {
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result.split(',')[1];
        await ClientService.uploadProgressPhoto(photoType, base64, new Date().toISOString());
        await refetch();
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Failed to upload photo:', err);
    }
  };

  if (loading) return <div>Loading your dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="p-6">
      {/* Welcome header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white mb-6">
        <h1 className="text-3xl font-bold">Welcome back, {data?.profile?.first_name}!</h1>
        <p>You're {data?.stats?.completion_rate || 0}% closer to your goal!</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Current Weight</h3>
          <p className="text-2xl font-bold">{data?.profile?.current_weight_kg || '-'} kg</p>
          <p className="text-sm text-green-600">
            {data?.stats?.weight_change ? `${data.stats.weight_change} kg` : '-'}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Workouts Completed</h3>
          <p className="text-2xl font-bold">{data?.stats?.completed_workouts || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Current Streak</h3>
          <p className="text-2xl font-bold">{data?.stats?.current_streak || 0} days</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-sm text-gray-600">Completion Rate</h3>
          <p className="text-2xl font-bold">{data?.stats?.completion_rate || 0}%</p>
        </div>
      </div>

      {/* Progress chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Progress Chart</h2>
          <div className="space-x-2">
            {['month', '3months', '6months', 'year'].map(period => (
              <button
                key={period}
                onClick={() => setChartPeriod(period)}
                className={`px-3 py-1 rounded ${
                  chartPeriod === period ? 'bg-blue-600 text-white' : 'bg-gray-200'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>
        
        {chartData && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.weightData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="x" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="y" stroke="#3B82F6" name="Weight (kg)" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Upcoming workouts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-4">Upcoming Workouts</h2>
        <div className="space-y-2">
          {data?.upcomingWorkouts?.map(workout => (
            <div key={workout.id} className="flex justify-between p-3 border rounded">
              <div>
                <p className="font-semibold">{workout.name}</p>
                <p className="text-sm text-gray-600">{workout.scheduled_date}</p>
              </div>
              <button className="bg-blue-600 text-white px-4 py-2 rounded">
                Start
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// =========================================
// /src/components/PaymentButton.jsx
// Stripe payment button component
// =========================================

import React, { useState } from 'react';
import { StripeService } from '../services/stripe.service';

export function PaymentButton({ priceId, planName, amount }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await StripeService.createCheckout(priceId);
      // User will be redirected to Stripe
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-xl font-bold">{planName}</h3>
      <p className="text-3xl font-bold mt-2">${amount}/mo</p>
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? 'Loading...' : 'Subscribe'}
      </button>
    </div>
  );
}

// =========================================
// /src/App.jsx
// Main App component with routing
// =========================================

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthService } from './services/auth.service';
import { AdminDashboard } from './components/AdminDashboard';
import { ClientDashboard } from './components/ClientDashboard';
import { Login } from './components/Login';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            user ? (
              user.role === 'admin' ? <AdminDashboard /> : <ClientDashboard />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default App;
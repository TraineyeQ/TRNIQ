import React, { useState, useEffect } from 'react';
import { Calendar, Users, TrendingUp, MessageSquare, Dumbbell, Apple, Camera, Award, Settings, Menu, X, ChevronRight, Plus, Check, AlertCircle, BarChart3, Clock, Target, Heart, Activity, FileText, Send, Mic, PlayCircle, PauseCircle, ChevronLeft, Upload, Search, Filter, Star, Bell, CreditCard, DollarSign, User, Lock, LogOut, Home, CheckCircle, XCircle, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, RadarChart, RadarChart as Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

// Main App - Single Trainer Platform with Payment Integration
const PersonalTrainingPlatform = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeView, setActiveView] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Simulate login - in production this would check JWT
  useEffect(() => {
    // Check if user is admin (trainer) or client
    const userRole = localStorage.getItem('userRole') || 'client';
    setIsAdmin(userRole === 'admin');
    setCurrentUser({
      id: '123',
      name: userRole === 'admin' ? 'Trainer Admin' : 'John Smith',
      email: userRole === 'admin' ? 'admin@fitness.com' : 'john@example.com',
      role: userRole,
      avatar: '👤'
    });
  }, []);

  // ==========================================
  // ADMIN (TRAINER) DASHBOARD
  // ==========================================
  const AdminDashboard = () => {
    const [selectedPeriod, setSelectedPeriod] = useState('week');
    
    // Revenue data for chart
    const revenueData = [
      { month: 'Jan', revenue: 4500, clients: 15 },
      { month: 'Feb', revenue: 5200, clients: 18 },
      { month: 'Mar', revenue: 5800, clients: 20 },
      { month: 'Apr', revenue: 6200, clients: 22 },
      { month: 'May', revenue: 7100, clients: 25 },
      { month: 'Jun', revenue: 7800, clients: 28 },
    ];

    const stats = [
      { 
        label: 'Total Revenue', 
        value: '$7,800', 
        change: '+12%', 
        icon: DollarSign, 
        color: 'green',
        subtext: 'This month'
      },
      { 
        label: 'Active Clients', 
        value: '28', 
        change: '+3', 
        icon: Users, 
        color: 'blue',
        subtext: '2 trial users'
      },
      { 
        label: 'Completion Rate', 
        value: '87%', 
        change: '+5%', 
        icon: CheckCircle, 
        color: 'purple',
        subtext: 'Workouts completed'
      },
      { 
        label: 'Avg Client Progress', 
        value: '14%', 
        change: '+2%', 
        icon: TrendingUp, 
        color: 'yellow',
        subtext: 'Goal achievement'
      },
    ];

    const recentActivity = [
      { client: 'Sarah Johnson', action: 'Completed workout', time: '10 min ago', status: 'success' },
      { client: 'Mike Chen', action: 'Payment received', amount: '$79', time: '1 hour ago', status: 'payment' },
      { client: 'Emily Davis', action: 'Missed check-in', time: '2 hours ago', status: 'warning' },
      { client: 'New User', action: 'Started trial', time: '3 hours ago', status: 'info' },
    ];

    const upcomingSessions = [
      { client: 'Sarah Johnson', time: '2:00 PM', type: 'Virtual Training' },
      { client: 'Mike Chen', time: '3:30 PM', type: 'Nutrition Review' },
      { client: 'Emily Davis', time: '5:00 PM', type: 'Progress Check' },
    ];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, manage your fitness empire</p>
          </div>
          <div className="flex space-x-2">
            <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2">
              <DollarSign size={20} />
              <span>View Payments</span>
            </button>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
              <Plus size={20} />
              <span>Add Client</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon size={24} className={`text-${stat.color}-600`} />
                </div>
                <span className={`text-sm font-semibold ${
                  stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-800">{stat.value}</div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
              <div className="text-xs text-gray-500 mt-2">{stat.subtext}</div>
            </div>
          ))}
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold">Revenue & Growth</h3>
            <div className="flex space-x-2">
              {['week', 'month', 'year'].map(period => (
                <button
                  key={period}
                  onClick={() => setSelectedPeriod(period)}
                  className={`px-3 py-1 rounded-lg capitalize ${
                    selectedPeriod === period 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                stroke="#3B82F6"
                fill="#93C5FD"
                name="Revenue ($)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="clients"
                stroke="#10B981"
                name="Active Clients"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-500' :
                      activity.status === 'payment' ? 'bg-blue-500' :
                      activity.status === 'warning' ? 'bg-yellow-500' :
                      'bg-gray-500'
                    }`} />
                    <div>
                      <p className="font-semibold text-gray-800">{activity.client}</p>
                      <p className="text-sm text-gray-600">
                        {activity.action}
                        {activity.amount && <span className="font-semibold text-green-600"> {activity.amount}</span>}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500">{activity.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Sessions */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Today's Schedule</h3>
            <div className="space-y-3">
              {upcomingSessions.map((session, i) => (
                <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-400 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Clock size={20} className="text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-800">{session.client}</p>
                      <p className="text-sm text-gray-600">{session.type}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-blue-600">{session.time}</span>
                </div>
              ))}
            </div>
            <button className="w-full mt-4 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200">
              View Full Calendar
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // CLIENT MANAGEMENT (ADMIN VIEW)
  // ==========================================
  const ClientManagement = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    
    const clients = [
      { 
        id: 1, 
        name: 'Sarah Johnson', 
        email: 'sarah@example.com',
        plan: 'Premium', 
        amount: '$79/mo',
        status: 'active',
        lastPayment: '2024-01-01',
        nextPayment: '2024-02-01',
        progress: 75,
        workoutsCompleted: 45,
        joinDate: '2023-10-15'
      },
      { 
        id: 2, 
        name: 'Mike Chen', 
        email: 'mike@example.com',
        plan: 'Basic', 
        amount: '$49/mo',
        status: 'active',
        lastPayment: '2024-01-05',
        nextPayment: '2024-02-05',
        progress: 60,
        workoutsCompleted: 32,
        joinDate: '2023-11-20'
      },
      { 
        id: 3, 
        name: 'Emily Davis', 
        email: 'emily@example.com',
        plan: 'Premium', 
        amount: '$79/mo',
        status: 'trial',
        lastPayment: null,
        nextPayment: '2024-01-20',
        progress: 30,
        workoutsCompleted: 8,
        joinDate: '2024-01-05'
      },
      { 
        id: 4, 
        name: 'John Williams', 
        email: 'john@example.com',
        plan: 'Basic', 
        amount: '$49/mo',
        status: 'cancelled',
        lastPayment: '2023-12-01',
        nextPayment: null,
        progress: 40,
        workoutsCompleted: 20,
        joinDate: '2023-08-10'
      }
    ];

    const filteredClients = clients.filter(client => 
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterStatus === 'all' || client.status === filterStatus)
    );

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold text-gray-800">Client Management</h2>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Plus size={20} />
            <span>Add New Client</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'active', 'trial', 'cancelled'].map(status => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-lg capitalize ${
                  filterStatus === status 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Clients Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Payment</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredClients.map(client => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{client.plan}</div>
                        <div className="text-sm font-semibold text-gray-600">{client.amount}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        client.status === 'active' ? 'bg-green-100 text-green-800' :
                        client.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900 mr-2">{client.progress}%</span>
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${client.progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {client.workoutsCompleted} workouts
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {client.nextPayment || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                      <button className="text-green-600 hover:text-green-900">Message</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // PAYMENT MANAGEMENT (ADMIN)
  // ==========================================
  const PaymentManagement = () => {
    const payments = [
      { id: 1, client: 'Sarah Johnson', amount: 79, date: '2024-01-01', status: 'completed', method: 'card' },
      { id: 2, client: 'Mike Chen', amount: 49, date: '2024-01-05', status: 'completed', method: 'card' },
      { id: 3, client: 'Emily Davis', amount: 79, date: '2024-01-10', status: 'pending', method: 'card' },
      { id: 4, client: 'Alex Brown', amount: 49, date: '2023-12-28', status: 'failed', method: 'card' },
    ];

    const monthlyRevenue = 7800;
    const yearlyRevenue = 84600;
    const averageClientValue = 278;
    const churnRate = 5.2;

    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-800">Payment Management</h2>

        {/* Revenue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="text-green-600" size={24} />
              <span className="text-sm text-green-600">+12%</span>
            </div>
            <div className="text-2xl font-bold">${monthlyRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Monthly Revenue</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-blue-600" size={24} />
              <span className="text-sm text-green-600">+18%</span>
            </div>
            <div className="text-2xl font-bold">${yearlyRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Yearly Revenue</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <User className="text-purple-600" size={24} />
              <span className="text-sm text-green-600">+8%</span>
            </div>
            <div className="text-2xl font-bold">${averageClientValue}</div>
            <div className="text-sm text-gray-600">Avg Client Value</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="text-red-600" size={24} />
              <span className="text-sm text-red-600">-2%</span>
            </div>
            <div className="text-2xl font-bold">{churnRate}%</div>
            <div className="text-sm text-gray-600">Churn Rate</div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">Recent Transactions</h3>
            <button className="text-blue-600 hover:text-blue-800">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3">Client</th>
                  <th className="text-left py-3">Amount</th>
                  <th className="text-left py-3">Date</th>
                  <th className="text-left py-3">Status</th>
                  <th className="text-left py-3">Method</th>
                  <th className="text-left py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(payment => (
                  <tr key={payment.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">{payment.client}</td>
                    <td className="py-3 font-semibold">${payment.amount}</td>
                    <td className="py-3">{payment.date}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        payment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className="py-3">
                      <CreditCard size={16} className="inline mr-1" />
                      {payment.method}
                    </td>
                    <td className="py-3">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stripe Connect Button */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-blue-900">Stripe Integration</h3>
              <p className="text-sm text-blue-700 mt-1">Connect your Stripe account to process payments automatically</p>
            </div>
            <button className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
              <CreditCard size={20} />
              <span>Connect Stripe</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // CLIENT DASHBOARD (CLIENT VIEW)
  // ==========================================
  const ClientDashboard = () => {
    // Progress data for charts
    const weightData = [
      { week: 'Week 1', weight: 180, bodyFat: 22 },
      { week: 'Week 2', weight: 178.5, bodyFat: 21.5 },
      { week: 'Week 3', weight: 177, bodyFat: 21 },
      { week: 'Week 4', weight: 176, bodyFat: 20.5 },
      { week: 'Week 5', weight: 175, bodyFat: 20 },
      { week: 'Week 6', weight: 174.5, bodyFat: 19.5 },
    ];

    const performanceData = [
      { exercise: 'Bench Press', current: 185, goal: 225, unit: 'lbs' },
      { exercise: 'Squat', current: 275, goal: 315, unit: 'lbs' },
      { exercise: 'Deadlift', current: 315, goal: 405, unit: 'lbs' },
      { exercise: 'Pull-ups', current: 12, goal: 20, unit: 'reps' },
    ];

    const weeklyActivity = [
      { day: 'Mon', workouts: 1, calories: 450 },
      { day: 'Tue', workouts: 0, calories: 0 },
      { day: 'Wed', workouts: 1, calories: 380 },
      { day: 'Thu', workouts: 1, calories: 420 },
      { day: 'Fri', workouts: 0, calories: 0 },
      { day: 'Sat', workouts: 1, calories: 500 },
      { day: 'Sun', workouts: 0, calories: 0 },
    ];

    const stats = [
      { label: 'Current Weight', value: '174.5 lbs', change: '-5.5 lbs', icon: TrendingDown, color: 'green' },
      { label: 'Body Fat', value: '19.5%', change: '-2.5%', icon: Activity, color: 'blue' },
      { label: 'Workouts This Week', value: '4', change: '+1', icon: Dumbbell, color: 'purple' },
      { label: 'Streak', value: '12 days', change: 'Personal Best!', icon: Award, color: 'yellow' },
    ];

    return (
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">Welcome back, {currentUser?.name}!</h1>
          <p className="opacity-90">You're 75% closer to your goal. Keep pushing! 💪</p>
          <div className="mt-4 bg-white bg-opacity-20 rounded-lg p-3">
            <div className="flex justify-between text-sm mb-1">
              <span>Goal Progress</span>
              <span className="font-semibold">75%</span>
            </div>
            <div className="w-full bg-white bg-opacity-30 rounded-full h-3">
              <div className="bg-white h-3 rounded-full" style={{ width: '75%' }} />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg bg-${stat.color}-100`}>
                  <stat.icon size={24} className={`text-${stat.color}-600`} />
                </div>
                <span className={`text-sm font-semibold ${
                  stat.change.includes('-') || stat.change.includes('+') ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {stat.change}
                </span>
              </div>
              <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Progress Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weight & Body Fat Chart */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Weight & Body Fat Progress</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="weight"
                  stroke="#3B82F6"
                  name="Weight (lbs)"
                  strokeWidth={2}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="bodyFat"
                  stroke="#10B981"
                  name="Body Fat (%)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Weekly Activity */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Weekly Activity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="workouts" fill="#3B82F6" name="Workouts" />
                <Bar dataKey="calories" fill="#10B981" name="Calories" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Performance Tracking */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold mb-4">Performance Tracking</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {performanceData.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">{item.exercise}</h4>
                <div className="text-2xl font-bold text-blue-600 mb-1">
                  {item.current} {item.unit}
                </div>
                <div className="text-sm text-gray-600 mb-3">Goal: {item.goal} {item.unit}</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${(item.current / item.goal) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round((item.current / item.goal) * 100)}% to goal
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Workouts */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">This Week's Workouts</h3>
            <button className="text-blue-600 hover:text-blue-800">View All</button>
          </div>
          <div className="space-y-3">
            {[
              { day: 'Today', workout: 'Upper Body Strength', time: '45 min', status: 'upcoming' },
              { day: 'Tomorrow', workout: 'HIIT Cardio', time: '30 min', status: 'scheduled' },
              { day: 'Thursday', workout: 'Lower Body Power', time: '50 min', status: 'scheduled' },
              { day: 'Saturday', workout: 'Full Body Circuit', time: '40 min', status: 'scheduled' },
            ].map((workout, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg hover:border-blue-400 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    workout.status === 'upcoming' ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <Dumbbell size={20} className={
                      workout.status === 'upcoming' ? 'text-blue-600' : 'text-gray-600'
                    } />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{workout.workout}</p>
                    <p className="text-sm text-gray-600">{workout.day} • {workout.time}</p>
                  </div>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                  Start
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // NAVIGATION
  // ==========================================
  const Navigation = () => {
    const adminNavItems = [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'clients', label: 'Clients', icon: Users },
      { id: 'payments', label: 'Payments', icon: DollarSign },
      { id: 'workouts', label: 'Programs', icon: Dumbbell },
      { id: 'nutrition', label: 'Meal Plans', icon: Apple },
      { id: 'messages', label: 'Messages', icon: MessageSquare },
      { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];

    const clientNavItems = [
      { id: 'dashboard', label: 'My Dashboard', icon: Home },
      { id: 'workouts', label: 'Workouts', icon: Dumbbell },
      { id: 'progress', label: 'Progress', icon: TrendingUp },
      { id: 'nutrition', label: 'Nutrition', icon: Apple },
      { id: 'messages', label: 'Coach Chat', icon: MessageSquare },
      { id: 'achievements', label: 'Achievements', icon: Award },
    ];

    const navItems = isAdmin ? adminNavItems : clientNavItems;

    return (
      <nav className="bg-gray-900 text-white w-64 min-h-screen p-4 hidden lg:block">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-blue-400">FitnessPro</h1>
          <p className="text-sm text-gray-400 mt-1">
            {isAdmin ? 'Admin Panel' : 'Client Portal'}
          </p>
        </div>

        {/* User Profile Section */}
        <div className="mb-6 p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">{currentUser?.avatar}</div>
            <div>
              <p className="font-semibold">{currentUser?.name}</p>
              <p className="text-xs text-gray-400">{currentUser?.role}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                activeView === item.id 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'hover:bg-gray-800 text-gray-300'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-auto pt-8 space-y-2">
          <button className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300">
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button 
            onClick={() => {
              localStorage.removeItem('userRole');
              setIsAdmin(!isAdmin);
              window.location.reload();
            }}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-800 text-gray-300"
          >
            <LogOut size={20} />
            <span>Switch View</span>
          </button>
        </div>
      </nav>
    );
  };

  // Main Render
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <Navigation />
        
        {/* Mobile Navigation */}
        <div className="lg:hidden">
          <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
            <h1 className="text-xl font-bold text-blue-400">FitnessPro</h1>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {/* Admin Views */}
          {isAdmin && activeView === 'dashboard' && <AdminDashboard />}
          {isAdmin && activeView === 'clients' && <ClientManagement />}
          {isAdmin && activeView === 'payments' && <PaymentManagement />}
          
          {/* Client Views */}
          {!isAdmin && activeView === 'dashboard' && <ClientDashboard />}
          
          {/* Shared Views (customize based on role) */}
          {activeView === 'workouts' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-3xl font-bold mb-4">
                {isAdmin ? 'Workout Programs' : 'My Workouts'}
              </h2>
              <p className="text-gray-600">Workout management interface...</p>
            </div>
          )}
          
          {activeView === 'messages' && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-3xl font-bold mb-4">Messages</h2>
              <p className="text-gray-600">Chat interface...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalTrainingPlatform;
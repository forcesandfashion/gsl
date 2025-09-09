import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Home, Users, Calendar, Target, TrendingUp } from 'lucide-react';

const CmbDashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    shooters: 0,
    ranges: 0,
    bookings: 0,
    events: 0
  });
  
  // Mock data for analytics - in real app, this would come from Firebase
  const [bookingAnalytics, setBookingAnalytics] = useState([]);
  const [shooterAnalytics, setShooterAnalytics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate Firebase data loading
    const loadDashboardData = () => {
      // Mock data - replace with actual Firebase calls
      setDashboardData({
        shooters: 247,
        ranges: 12,
        bookings: 89,
        events: 15
      });

      // Mock booking analytics data
      setBookingAnalytics([
        { month: 'Jan', bookings: 45, revenue: 12500 },
        { month: 'Feb', bookings: 52, revenue: 14200 },
        { month: 'Mar', bookings: 38, revenue: 10800 },
        { month: 'Apr', bookings: 67, revenue: 18900 },
        { month: 'May', bookings: 89, revenue: 24500 },
        { month: 'Jun', bookings: 73, revenue: 20100 }
      ]);

      // Mock shooter analytics data
      setShooterAnalytics([
        { category: 'Beginners', count: 98, color: '#8884d8' },
        { category: 'Intermediate', count: 87, color: '#82ca9d' },
        { category: 'Advanced', count: 45, color: '#ffc658' },
        { category: 'Professional', count: 17, color: '#ff7c7c' }
      ]);
    };

    loadDashboardData();
  }, []);

  const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{borderLeftColor: color}}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="p-3 rounded-full" style={{backgroundColor: color + '20'}}>
          <Icon className="h-6 w-6" style={{color: color}} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-bold text-gray-900">CMB Dashboard</h1>
            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard 
            title="Shooters" 
            value={dashboardData.shooters} 
            icon={Users} 
            color="#3b82f6" 
          />
          <StatCard 
            title="Data Ranges" 
            value={dashboardData.ranges} 
            icon={Target} 
            color="#10b981" 
          />
          <StatCard 
            title="Bookings" 
            value={dashboardData.bookings} 
            icon={Calendar} 
            color="#f59e0b" 
          />
          <StatCard 
            title="Events" 
            value={dashboardData.events} 
            icon={TrendingUp} 
            color="#ef4444" 
          />
        </div>

        {/* Analytics Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bookings Analytics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Bookings</h2>
            {loading ? (
              <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bookingAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill="#3b82f6" name="Bookings" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Shooters Registration Trend */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">New Shooter Registrations</h2>
            {loading ? (
              <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={shooterAnalytics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="shooters" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="New Shooters"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Bookings vs Shooters Comparison */}
          <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Overview</h2>
            {loading ? (
              <div className="h-80 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bookingAnalytics.map((booking, index) => ({
                  ...booking,
                  shooters: shooterAnalytics[index]?.shooters || 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="bookings" fill="#3b82f6" name="Bookings" />
                  <Bar dataKey="shooters" fill="#10b981" name="New Shooters" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-700">New booking created for Range A - Slot 14:00</span>
              <span className="ml-auto text-xs text-gray-500">2 hours ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
              <span className="text-sm text-gray-700">New shooter registered - John Doe</span>
              <span className="ml-auto text-xs text-gray-500">5 hours ago</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-gray-700">Event "Monthly Championship" scheduled</span>
              <span className="ml-auto text-xs text-gray-500">1 day ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CmbDashboard;
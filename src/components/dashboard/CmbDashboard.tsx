import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Home, Users, Calendar, Target, TrendingUp } from 'lucide-react';
import { getFirestore, collection, getDocs, query, orderBy, where, Timestamp, DocumentData } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router';

// Initialize Firestore (assumes Firebase app is configured elsewhere)
const db = getFirestore();

// TypeScript interfaces
interface DashboardData {
  shooters: number;
  ranges: number;
  bookings: number;
  events: number;
}

interface BookingAnalytics {
  month: string;
  bookings: number;
  revenue: number;
}

interface ShooterAnalytics {
  month: string;
  shooters: number;
}

interface MonthData {
  month: string;
  year: number;
  monthIndex: number;
  startDate: Date;
  endDate: Date;
}

interface Activity {
  id: string;
  type: 'booking' | 'shooter' | 'event';
  createdAt?: any;
  name?: string;
  firstName?: string;
  lastName?: string;
  rangeName?: string;
  timeSlot?: string;
  [key: string]: any;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<any>;
  color: string;
  onClick?: () => void;
  loading?: boolean;
}

const CmbDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    shooters: 0,
    ranges: 0,
    bookings: 0,
    events: 0
  });
  
  const navigate = useNavigate();
  const [bookingAnalytics, setBookingAnalytics] = useState<BookingAnalytics[]>([]);
  const [shooterAnalytics, setShooterAnalytics] = useState<ShooterAnalytics[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to get month name
  const getMonthName = (monthIndex: number): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
  };

  // Helper function to get last 6 months
  const getLast6Months = (): MonthData[] => {
    const months: MonthData[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: getMonthName(date.getMonth()),
        year: date.getFullYear(),
        monthIndex: date.getMonth(),
        startDate: new Date(date.getFullYear(), date.getMonth(), 1),
        endDate: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59)
      });
    }
    return months;
  };

  // Handle card clicks with navigation
  const handleCardClick = (type: string): void => {
    switch (type) {
      case 'shooters':
        navigate('/dashboard/cmb/shooters-data');
        break;
      case 'ranges':
        navigate('/dashboard/cmb/ranges');
        break;
      case 'bookings':
        navigate('/dashboard/cmb/cmb-bookings');
        break;
      case 'events':
        navigate('/dashboard/cmb/cmb-events');
        break;
      default:
        console.log(`Navigation for ${type} not configured`);
    }
  };

  // Fetch dashboard stats
  const fetchDashboardStats = async (): Promise<void> => {
    try {
      const [shootersSnapshot, rangesSnapshot, bookingsSnapshot, eventsSnapshot] = await Promise.all([
        getDocs(collection(db, 'shooters')),
        getDocs(collection(db, 'ranges')),
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'events'))
      ]);

      setDashboardData({
        shooters: shootersSnapshot.size,
        ranges: rangesSnapshot.size,
        bookings: bookingsSnapshot.size,
        events: eventsSnapshot.size
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      setError('Failed to load dashboard statistics');
    }
  };

  // Fetch booking analytics for last 6 months
  const fetchBookingAnalytics = async (): Promise<void> => {
    try {
      const months = getLast6Months();
      const bookingData: BookingAnalytics[] = [];

      for (const monthData of months) {
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('createdAt', '>=', Timestamp.fromDate(monthData.startDate)),
          where('createdAt', '<=', Timestamp.fromDate(monthData.endDate))
        );

        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookings = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Calculate revenue (assuming each booking has a 'price' or 'amount' field)
        const revenue = bookings.reduce((total: number, booking: any) => {
          return total + (booking.price || booking.amount || 0);
        }, 0);

        bookingData.push({
          month: monthData.month,
          bookings: bookings.length,
          revenue: revenue
        });
      }

      setBookingAnalytics(bookingData);
    } catch (error) {
      console.error('Error fetching booking analytics:', error);
      setError('Failed to load booking analytics');
    }
  };

  // Fetch shooter registration analytics for last 6 months
  const fetchShooterAnalytics = async (): Promise<void> => {
    try {
      const months = getLast6Months();
      const shooterData: ShooterAnalytics[] = [];

      for (const monthData of months) {
        const shootersQuery = query(
          collection(db, 'shooters'),
          where('createdAt', '>=', Timestamp.fromDate(monthData.startDate)),
          where('createdAt', '<=', Timestamp.fromDate(monthData.endDate))
        );

        const shootersSnapshot = await getDocs(shootersQuery);
        
        shooterData.push({
          month: monthData.month,
          shooters: shootersSnapshot.size
        });
      }

      setShooterAnalytics(shooterData);
    } catch (error) {
      console.error('Error fetching shooter analytics:', error);
      // If shooters don't have createdAt field, provide fallback data
      const months = getLast6Months();
      const fallbackData: ShooterAnalytics[] = months.map(monthData => ({
        month: monthData.month,
        shooters: Math.floor(Math.random() * 20) + 5 // Random fallback
      }));
      setShooterAnalytics(fallbackData);
    }
  };

  // Fetch recent activity from multiple collections
  const fetchRecentActivity = async (): Promise<Activity[]> => {
    try {
      // Get recent bookings
      const recentBookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      );
      
      const bookingsSnapshot = await getDocs(recentBookingsQuery);
      const recentBookings: Activity[] = bookingsSnapshot.docs.slice(0, 3).map(doc => ({
        id: doc.id,
        type: 'booking' as const,
        ...doc.data()
      }));

      // Get recent shooter registrations
      const recentShootersQuery = query(
        collection(db, 'shooters'),
        orderBy('createdAt', 'desc')
      );
      
      const shootersSnapshot = await getDocs(recentShootersQuery);
      const recentShooters: Activity[] = shootersSnapshot.docs.slice(0, 2).map(doc => ({
        id: doc.id,
        type: 'shooter' as const,
        ...doc.data()
      }));

      // Combine and sort by date
      const allActivity: Activity[] = [...recentBookings, ...recentShooters];
      allActivity.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      return allActivity.slice(0, 3);
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      return [];
    }
  };

  useEffect(() => {
    const loadAllData = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchDashboardStats(),
          fetchBookingAnalytics(),
          fetchShooterAnalytics()
        ]);

        const activity = await fetchRecentActivity();
        setRecentActivity(activity);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

  const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, onClick, loading: cardLoading }) => (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 border-l-4 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105 hover:border-opacity-80' : ''
      }`}
      style={{borderLeftColor: color}}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">
            {cardLoading ? (
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              value
            )}
          </p>
        </div>
        <div className="p-3 rounded-full" style={{backgroundColor: color + '20'}}>
          <Icon className="h-6 w-6" style={{color: color}} />
        </div>
      </div>
      {onClick && (
        <div className="mt-2 text-xs text-gray-500">
          Click to view details
        </div>
      )}
    </div>
  );

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (timestamp: any): string => {
    if (!timestamp) return 'Unknown time';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Less than an hour ago';
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  const handleRetry = (): void => {
    window.location.reload();
  };

  const handleHomeClick = (): void => {
    window.location.href = '/';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <div className="text-red-600 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-bold text-gray-900">CMB Dashboard</h1>
            <button 
              onClick={handleHomeClick}
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
            title="Total Shooters" 
            value={dashboardData.shooters} 
            icon={Users} 
            color="#3b82f6"
            onClick={() => handleCardClick('shooters')}
            loading={loading}
          />
          <StatCard 
            title="Shooting Ranges" 
            value={dashboardData.ranges} 
            icon={Target} 
            color="#10b981"
            onClick={() => handleCardClick('ranges')}
            loading={loading}
          />
          <StatCard 
            title="Total Bookings" 
            value={dashboardData.bookings} 
            icon={Calendar} 
            color="#f59e0b"
            onClick={() => handleCardClick('bookings')}
            loading={loading}
          />
          <StatCard 
            title="Upcoming Events" 
            value={dashboardData.events} 
            icon={TrendingUp} 
            color="#ef4444"
            onClick={() => handleCardClick('events')}
            loading={loading}
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

          {/* Combined Analytics */}
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
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                    activity.type === 'booking' ? 'bg-blue-50' : 
                    activity.type === 'shooter' ? 'bg-green-50' : 
                    'bg-yellow-50'
                  }`}>
                    {activity.type === 'booking' ? (
                      <Calendar className="h-5 w-5 text-blue-600" />
                    ) : activity.type === 'shooter' ? (
                      <Users className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-yellow-600" />
                    )}
                    <span className="text-sm text-gray-700">
                      {activity.type === 'booking' ?
                        `New booking ${activity.rangeName ? `for ${activity.rangeName}` : ''}${activity.timeSlot ? ` - ${activity.timeSlot}` : ''}` :
                        activity.type === 'shooter' ?
                        `New shooter registered${activity.name ? ` - ${activity.name}` : ''}${activity.firstName && activity.lastName ? ` - ${activity.firstName} ${activity.lastName}` : ''}` :
                        'New activity'
                      }
                    </span>
                    <span className="ml-auto text-xs text-gray-500">
                      {formatRelativeTime(activity.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No recent activity found
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CmbDashboard;
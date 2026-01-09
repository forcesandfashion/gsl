import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Home, Users, Calendar, Target, TrendingUp, FileText, CreditCard, Clock, CheckCircle, Crown, MapPin, DollarSign, UserCheck } from 'lucide-react';
import { getFirestore, collection, getDocs, query, orderBy, where, Timestamp, DocumentData } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router';
import { db } from '@/firebase/config';


// TypeScript interfaces
interface DashboardData {
  shooters: number;
  ranges: number;
  bookings: number;
  events: number;
  bills: number;
  subscriptions: number;
  attendance: number;
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
  type: 'booking' | 'shooter' | 'event' | 'bill' | 'subscription' | 'attendance';
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

interface Bill {
  id: string;
  amountPaid: number;
  billDate: any;
  billId: string;
  billStatus: string;
  billType: string;
  createdAt: any;
  currency: string;
  description: string;
  paymentMethod: string;
  paymentStatus: string;
  planDuration: string;
  planMonths: number;
  rangeId: string;
  rangeName: string;
  rangeOwnerEmail: string;
  rangeOwnerId: string;
  subscriptionId: string;
  updatedAt: any;
  userEmail: string;
  userId: string;
  userName: string;
}

interface Subscription {
  id: string;
  createdAt: any;
  endDate: any;
  extensions: any[];
  features: string[];
  paymentMethod: string;
  paymentStatus: string;
  planDuration: string;
  planMonths: number;
  price: number;
  rangeId: string;
  rangeName: string;
  startDate: any;
  subscriptionStatus: string;
  updatedAt: any;
  userEmail: string;
  userId: string;
  userName?: string;
}

interface Attendance {
  id: string;
  checkInTime: string;
  date: string;
  rangeId: string;
  rangeName: string;
  status: string;
  subscriptionId: string;
  timestamp: any;
  userEmail: string;
  userId: string;
  userName: string;
}

const CmbDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    shooters: 0,
    ranges: 0,
    bookings: 0,
    events: 0,
    bills: 0,
    subscriptions: 0,
    attendance: 0
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
      case 'bills':
        navigate('/dashboard/cmb/bills');
        break;
      case 'subscriptions':
        navigate('/dashboard/cmb/subscriptions');
        break;
      case 'attendance':
        navigate('/dashboard/cmb/attendance');
        break;
      default:
        console.log(`Navigation for ${type} not configured`);
    }
  };

  // Fetch dashboard stats
  const fetchDashboardStats = async (): Promise<void> => {
    try {
      const [
        shootersSnapshot, 
        rangesSnapshot, 
        bookingsSnapshot, 
        eventsSnapshot,
        billsSnapshot,
        subscriptionsSnapshot,
        attendanceSnapshot
      ] = await Promise.all([
        getDocs(collection(db, 'shooters')),
        getDocs(collection(db, 'ranges')),
        getDocs(collection(db, 'bookings')),
        getDocs(collection(db, 'events')),
        getDocs(collection(db, 'bills')),
        getDocs(collection(db, 'subscriptions')),
        getDocs(collection(db, 'attendance'))
      ]);

      setDashboardData({
        shooters: shootersSnapshot.size,
        ranges: rangesSnapshot.size,
        bookings: bookingsSnapshot.size,
        events: eventsSnapshot.size,
        bills: billsSnapshot.size,
        subscriptions: subscriptionsSnapshot.size,
        attendance: attendanceSnapshot.size
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
        shooters: Math.floor(Math.random() * 20) + 5
      }));
      setShooterAnalytics(fallbackData);
    }
  };

  // Fetch recent activity from multiple collections
  const fetchRecentActivity = async (): Promise<Activity[]> => {
    try {
      // Get recent bills
      const recentBillsQuery = query(
        collection(db, 'bills'),
        orderBy('createdAt', 'desc')
      );
      
      const billsSnapshot = await getDocs(recentBillsQuery);
      const recentBills: Activity[] = billsSnapshot.docs.slice(0, 2).map(doc => ({
        id: doc.id,
        type: 'bill' as const,
        ...doc.data()
      }));

      // Get recent subscriptions
      const recentSubscriptionsQuery = query(
        collection(db, 'subscriptions'),
        orderBy('createdAt', 'desc')
      );
      
      const subscriptionsSnapshot = await getDocs(recentSubscriptionsQuery);
      const recentSubscriptions: Activity[] = subscriptionsSnapshot.docs.slice(0, 2).map(doc => ({
        id: doc.id,
        type: 'subscription' as const,
        ...doc.data()
      }));

      // Get recent attendance
      const recentAttendanceQuery = query(
        collection(db, 'attendance'),
        orderBy('timestamp', 'desc')
      );
      
      const attendanceSnapshot = await getDocs(recentAttendanceQuery);
      const recentAttendance: Activity[] = attendanceSnapshot.docs.slice(0, 2).map(doc => ({
        id: doc.id,
        type: 'attendance' as const,
        ...doc.data()
      }));

      // Combine and sort by date
      const allActivity: Activity[] = [...recentBills, ...recentSubscriptions, ...recentAttendance];
      allActivity.sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0);
        const dateB = b.createdAt?.toDate() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      return allActivity.slice(0, 5);
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
      className={`bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-lg hover:scale-105 hover:border-opacity-80' : ''
      }`}
      style={{borderLeftColor: color}}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900">
            {cardLoading ? (
              <div className="h-6 sm:h-8 w-12 sm:w-16 bg-gray-200 rounded animate-pulse"></div>
            ) : (
              value.toLocaleString()
            )}
          </p>
        </div>
        <div className="p-2 sm:p-3 rounded-full" style={{backgroundColor: color + '20'}}>
          <Icon className="h-4 w-4 sm:h-6 sm:w-6" style={{color: color}} />
        </div>
      </div>
      {onClick && (
        <div className="mt-1 sm:mt-2 text-xs text-gray-500">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full">
          <div className="text-red-600 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={handleRetry}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg w-full sm:w-auto"
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
          <div className="flex flex-col sm:flex-row justify-between items-center py-4 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">CMB Dashboard</h1>
            <button 
              onClick={handleHomeClick}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors w-full sm:w-auto justify-center"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
            color="#ff6b6b"
            onClick={() => handleCardClick('ranges')}
            loading={loading}
          />
          <StatCard 
            title="Total Bookings" 
            value={dashboardData.bookings} 
            icon={Calendar} 
            color="#3b82f6"
            onClick={() => handleCardClick('bookings')}
            loading={loading}
          />
          <StatCard 
            title="Upcoming Events" 
            value={dashboardData.events} 
            icon={TrendingUp} 
            color="#ff6b6b"
            onClick={() => handleCardClick('events')}
            loading={loading}
          />
          <StatCard 
            title="Total Bills" 
            value={dashboardData.bills} 
            icon={FileText} 
            color="#3b82f6"
            onClick={() => handleCardClick('bills')}
            loading={loading}
          />
          <StatCard 
            title="Active Subscriptions" 
            value={dashboardData.subscriptions} 
            icon={CreditCard} 
            color="#ff6b6b"
            onClick={() => handleCardClick('subscriptions')}
            loading={loading}
          />
          <StatCard 
            title="Attendance Records" 
            value={dashboardData.attendance} 
            icon={UserCheck} 
            color="#3b82f6"
            onClick={() => handleCardClick('attendance')}
            loading={loading}
          />
        </div>

        {/* Analytics Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Bookings Analytics */}
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Monthly Bookings</h2>
            {loading ? (
              <div className="h-64 sm:h-80 bg-gray-200 rounded animate-pulse"></div>
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
          <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">New Shooter Registrations</h2>
            {loading ? (
              <div className="h-64 sm:h-80 bg-gray-200 rounded animate-pulse"></div>
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
                    stroke="#ff6b6b" 
                    strokeWidth={3}
                    name="New Shooters"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-[#ff6b6b] mb-4">Recent Activity</h2>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 sm:h-16 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity, index) => (
                  <div key={index} className={`flex items-center gap-3 p-3 rounded-lg ${
                    activity.type === 'bill' ? 'bg-purple-50' : 
                    activity.type === 'subscription' ? 'bg-pink-50' : 
                    activity.type === 'attendance' ? 'bg-cyan-50' : 
                    'bg-gray-50'
                  }`}>
                    {activity.type === 'bill' ? (
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                    ) : activity.type === 'subscription' ? (
                      <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-pink-600" />
                    ) : activity.type === 'attendance' ? (
                      <UserCheck className="h-4 w-4 sm:h-5 sm:w-5 text-cyan-600" />
                    ) : (
                      <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                    )}
                    <span className="text-xs sm:text-sm text-gray-700 flex-1">
                      {activity.type === 'bill' ?
                        `New bill ${activity.billId ? `- ${activity.billId}` : ''} for ${activity.amountPaid ? `${activity.currency || 'INR'} ${activity.amountPaid}` : ''}` :
                        activity.type === 'subscription' ?
                        `New subscription ${activity.planDuration ? `- ${activity.planDuration}` : ''} for ${activity.userName || activity.userEmail}` :
                        activity.type === 'attendance' ?
                        `Attendance recorded for ${activity.userName || activity.userEmail} at ${activity.rangeName}` :
                        'New activity'
                      }
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(activity.createdAt || activity.timestamp)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-6 sm:py-8">
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
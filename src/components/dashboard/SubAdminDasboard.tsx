import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { db } from "@/firebase/config";
import { 
  collection, 
  getDocs, 
  query, 
  doc, 
  updateDoc, 
  orderBy,
  Timestamp,
  where,
  onSnapshot,
  Unsubscribe 
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Shield, 
  Globe, 
  MapPin, 
  Trash2, 
  Plus, 
  AlertCircle, 
  Target,
  Calendar,
  Eye,
  EyeOff,
  CheckCircle,
  Clock,
  X,
  RefreshCw,
  FileX,
  CreditCard,
  Package,
  FileCheck,
  FileText
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Type definitions
type UserRole = 'admin' | 'sub_admin' | 'shooter' | 'range_owner';

interface CmbAccount {
  id: string;
  username: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended' | 'deleted';
  createdAt?: string;
  createdBy?: string;
  createdByRole?: 'admin' | 'sub_admin';
  lastLogin?: string | null;
  loginCount?: number;
  updatedAt?: string;
  statusUpdatedAt?: string;
  statusUpdatedBy?: string;
}

interface Counts {
  shooters: number;
  rangeOwners: number;
  products: number;
  ranges: number;
  events: number;
  actions: number;
  billsandsubscriptions: number;
  kycRequests: number;
  loading: boolean;
}

interface CmbAccountForm {
  username: string;
  email: string;
  password: string;
}

interface ChartDataPoint {
  name: string;
  shooters?: number;
  bookings?: number;
}

interface BookingsData {
  week: ChartDataPoint[];
  month: ChartDataPoint[];
  year: ChartDataPoint[];
}

interface UpdatingStatus {
  [accountId: string]: boolean;
}

type TimeFrame = 'week' | 'month' | 'year';
type AccountStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

const SubAdminDashboard: React.FC = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();



  // State for storing counts
  const [counts, setCounts] = useState<Counts>({
    shooters: 0,
    rangeOwners: 0,
    ranges: 0,
    products: 0,
    events: 0,
    actions: 0,
    billsandsubscriptions: 0,
    kycRequests: 0,
    loading: true
  });

  // State for CMB accounts
  const [cmbAccounts, setCmbAccounts] = useState<CmbAccount[]>([]);
  const [loadingCmbAccounts, setLoadingCmbAccounts] = useState<boolean>(true);
  const [updatingStatus, setUpdatingStatus] = useState<UpdatingStatus>({});

  // State for analytics
  const [shootersData, setShootersData] = useState<ChartDataPoint[]>([]);
  const [bookingsData, setBookingsData] = useState<BookingsData>({
    week: [],
    month: [],
    year: []
  });
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month');

  // State for CMB account modal
  const [isCmbModalOpen, setIsCmbModalOpen] = useState<boolean>(false);
  const [newCmbAccount, setNewCmbAccount] = useState<CmbAccountForm>({
    username: "",
    email: "",
    password: ""
  });
  const [isCreatingCmb, setIsCreatingCmb] = useState<boolean>(false);
  const [showCmbPassword, setShowCmbPassword] = useState<boolean>(false);

  // State for messages
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const API_BASE_URL = 'https://us-central1-global-shooting-league.cloudfunctions.net';

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
    if (!user) throw new Error('No authenticated user');
    
    const idToken: string = await user.getIdToken();
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  };

  // Get user role and name
  const getUserInfo = () => {
    if (!user?.displayName) return { name: user?.email || 'Sub-Admin', role: 'sub_admin' };
    const [name, role] = user.displayName.split('|');
    return { name: name || user.email || 'Sub-Admin', role: role as UserRole || 'sub_admin' };
  };

  const { name: userName, role: userRole } = getUserInfo();

  // Loading state while checking user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Fetch data from Firebase collections
  useEffect(() => {
    const fetchCounts = async (): Promise<void> => {
      try {
        // Query shooters collection
        const shootersSnapshot = await getDocs(collection(db, "shooters"));
        const shootersCount = shootersSnapshot.size;

        // Query range-owners collection
        const rangeOwnersSnapshot = await getDocs(collection(db, "range-owners"));
        const rangeOwnersCount = rangeOwnersSnapshot.size;

        const productsSnapshot = await getDocs(collection(db, "products"));
        const productsCount = productsSnapshot.size;

        // Query ranges collection
        const rangesSnapshot = await getDocs(collection(db, "ranges"));
        const rangesCount = rangesSnapshot.size;

        const actionsSnapshot = await getDocs(collection(db, "actions"));
        const actionsCount = actionsSnapshot.size;

        const billsSnapshot = await getDocs(collection(db, "bills"));
        const billsCount = billsSnapshot.size;

        const subscriptionsSnapshot = await getDocs(collection(db, "subscriptions"));
        const subscriptionsCount = subscriptionsSnapshot.size;

        const billsandsubscriptions = billsCount + subscriptionsCount;

        // Query events collection
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const eventsCount = eventsSnapshot.size;

        // Query KYC applications collection
        const kycQuery = query(
          collection(db, "kyc-applications"),
          where("status", "==", "pending")
        );
        const kycSnapshot = await getDocs(kycQuery);
        const kycRequestsCount = kycSnapshot.size;

        // Update state with fetched counts
        setCounts({
          shooters: shootersCount,
          rangeOwners: rangeOwnersCount,
          ranges: rangesCount,
          products: productsCount,
          actions: actionsCount,
          billsandsubscriptions: billsandsubscriptions,
          events: eventsCount,
          kycRequests: kycRequestsCount,
          loading: false
        });
      } catch (error) {
        console.error("Error fetching collection counts:", error);
        setCounts(prev => ({ ...prev, loading: false }));
      }
    };

    fetchCounts();
  }, []);

  // Fetch shooters data for chart
  useEffect((): (() => void) | void => {
    if (!user) return;

    try {
      const shootersQuery = query(
        collection(db, 'shooters'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe: Unsubscribe = onSnapshot(shootersQuery, 
        (querySnapshot) => {
          const shootersByMonth: { [key: string]: number } = {};
          const currentDate = new Date();
          
          // Initialize last 6 months
          for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
            shootersByMonth[monthKey] = 0;
          }

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.createdAt) {
              const createdDate = data.createdAt.toDate();
              const monthKey = createdDate.toLocaleDateString('en-US', { month: 'short' });
              if (shootersByMonth.hasOwnProperty(monthKey)) {
                shootersByMonth[monthKey]++;
              }
            }
          });

          const chartData: ChartDataPoint[] = Object.entries(shootersByMonth).map(([month, count]) => ({
            name: month,
            shooters: count
          }));

          setShootersData(chartData);
        },
        (err: Error) => {
          console.error('Error fetching shooters data:', err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up shooters listener:', err);
    }
  }, [user]);

  // Fetch bookings data for chart
  useEffect((): (() => void) | void => {
    if (!user) return;

    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      );

      const unsubscribe: Unsubscribe = onSnapshot(bookingsQuery, 
        (querySnapshot) => {
          const currentDate = new Date();
          
          // Week data (last 7 days)
          const weekData: { [key: string]: number } = {};
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          for (let i = 6; i >= 0; i--) {
            const date = new Date(currentDate);
            date.setDate(date.getDate() - i);
            const dayKey = dayNames[date.getDay()];
            weekData[dayKey] = 0;
          }

          // Month data (last 4 weeks)
          const monthData: { [key: string]: number } = {
            'Week 1': 0,
            'Week 2': 0,
            'Week 3': 0,
            'Week 4': 0
          };

          // Year data (last 6 months)
          const yearData: { [key: string]: number } = {};
          for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            const monthKey = date.toLocaleDateString('en-US', { month: 'short' });
            yearData[monthKey] = 0;
          }

          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.createdAt) {
              const createdDate = data.createdAt.toDate();
              
              // Week calculation
              const daysDiff = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysDiff >= 0 && daysDiff < 7) {
                const dayKey = dayNames[createdDate.getDay()];
                weekData[dayKey]++;
              }

              // Month calculation (last 4 weeks)
              if (daysDiff >= 0 && daysDiff < 28) {
                const weekNumber = Math.floor(daysDiff / 7) + 1;
                if (weekNumber <= 4) {
                  monthData[`Week ${weekNumber}`]++;
                }
              }

              // Year calculation
              const monthKey = createdDate.toLocaleDateString('en-US', { month: 'short' });
              if (yearData.hasOwnProperty(monthKey)) {
                yearData[monthKey]++;
              }
            }
          });

          const newBookingsData: BookingsData = {
            week: Object.entries(weekData).map(([day, count]) => ({
              name: day,
              bookings: count
            })),
            month: Object.entries(monthData).map(([week, count]) => ({
              name: week,
              bookings: count
            })),
            year: Object.entries(yearData).map(([month, count]) => ({
              name: month,
              bookings: count
            }))
          };

          setBookingsData(newBookingsData);
        },
        (err: Error) => {
          console.error('Error fetching bookings data:', err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up bookings listener:', err);
    }
  }, [user]);

  // Fetch CMB accounts
  useEffect((): (() => void) | void => {
    if (!user) return;

    setLoadingCmbAccounts(true);
    setError('');

    try {
      const cmbQuery = query(
        collection(db, 'cmb'),
        where('status', 'in', ['active', 'inactive', 'suspended'] as AccountStatus[]),
      );

      const unsubscribe: Unsubscribe = onSnapshot(cmbQuery, 
        (querySnapshot) => {
          const accounts: CmbAccount[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            accounts.push({
              id: doc.id,
              username: data.username,
              email: data.email,
              status: data.status as AccountStatus,
              createdAt: data.createdAt?.toDate().toISOString(),
              createdBy: data.createdBy,
              createdByRole: data.createdByRole as 'admin' | 'sub_admin',
              lastLogin: data.lastLogin?.toDate().toISOString() || null,
              loginCount: data.loginCount || 0,
              updatedAt: data.updatedAt?.toDate().toISOString(),
              statusUpdatedAt: data.statusUpdatedAt?.toDate().toISOString(),
              statusUpdatedBy: data.statusUpdatedBy
            });
          });
          setCmbAccounts(accounts);
          setLoadingCmbAccounts(false);
        },
        (err: Error) => {
          console.error('Error fetching CMB accounts:', err);
          setError('Failed to fetch CMB accounts: ' + err.message);
          setLoadingCmbAccounts(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up CMB accounts listener:', err);
      setError('Failed to set up real-time updates: ' + (err as Error).message);
      setLoadingCmbAccounts(false);
    }
  }, [user]);

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate("/");
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Handle creating new CMB account
  const handleCreateCmbAccount = async (): Promise<void> => {
    if (!newCmbAccount.username || !newCmbAccount.email || !newCmbAccount.password) {
      setError('All fields are required');
      return;
    }

    if (newCmbAccount.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    try {
      setIsCreatingCmb(true);
      setError('');
      setSuccess('');

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/createCmbAccount`, {
        method: 'POST',
        body: JSON.stringify(newCmbAccount)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create CMB account');
      }

      setSuccess('CMB account created successfully!');
      setNewCmbAccount({ username: '', email: '', password: '' });
      setIsCmbModalOpen(false);

    } catch (err) {
      console.error('Error creating CMB account:', err);
      setError((err as Error).message || 'Failed to create CMB account');
    } finally {
      setIsCreatingCmb(false);
    }
  };

  // Handle deleting CMB account
  const handleDeleteCmbAccount = async (accountId: string, username: string): Promise<void> => {
    if (!confirm(`Are you sure you want to delete the CMB account "${username}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/deleteCmbAccount`, {
        method: 'POST',
        body: JSON.stringify({ cmbAccountId: accountId })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete CMB account');
      }

      setSuccess(`CMB account "${username}" deleted successfully!`);

    } catch (err) {
      console.error('Error deleting CMB account:', err);
      setError((err as Error).message || 'Failed to delete CMB account');
    }
  };

  // Update CMB account status
  const handleCmbStatusUpdate = async (accountId: string, newStatus: Exclude<AccountStatus, 'deleted'>): Promise<void> => {
    if (!user) return;

    try {
      setUpdatingStatus(prev => ({ ...prev, [accountId]: true }));
      setError('');
      setSuccess('');

      const accountRef = doc(db, 'cmb', accountId);
      await updateDoc(accountRef, {
        status: newStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: user.uid,
        updatedAt: new Date()
      });

      setSuccess(`Account status updated to ${newStatus}!`);

    } catch (err) {
      console.error('Error updating account status:', err);
      setError((err as Error).message || 'Failed to update account status');
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [accountId]: false }));
    }
  };

  // Helper functions
  const getStatusColor = (status: AccountStatus): string => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'inactive': return 'text-gray-600 bg-gray-100';
      case 'suspended': return 'text-red-600 bg-red-100';
      case 'deleted': return 'text-red-800 bg-red-200';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: AccountStatus): JSX.Element => {
    switch (status) {
      case 'active': return <CheckCircle size={16} />;
      case 'inactive': return <Clock size={16} />;
      case 'suspended': return <AlertCircle size={16} />;
      case 'deleted': return <X size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // Calculate percentages for system statistics
  const totalUsers: number = counts.shooters + counts.rangeOwners;
  const shootersPercentage: string = totalUsers > 0 ? 
    ((counts.shooters / totalUsers) * 100).toFixed(1) : "0";
  const rangeOwnersPercentage: string = totalUsers > 0 ? 
    ((counts.rangeOwners / totalUsers) * 100).toFixed(1) : "0";

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Sub-Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage platform operations</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border">
                <span className="font-medium">{userName}</span>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                  Sub-Admin
                </span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Success/Error Messages */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 shadow-sm">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50 shadow-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Analytics Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
          {/* Shooters Growth Chart */}
          <Card className="bg-white/60 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Shooter Account Growth
              </CardTitle>
              <CardDescription className="text-gray-600">New shooter registrations over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={shootersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="shooters" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.1}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bookings Chart */}
          <Card className="bg-white/60 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-green-600" />
                    Booking Analytics
                  </CardTitle>
                  <CardDescription className="text-gray-600">Booking trends by time period</CardDescription>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1 shadow-inner">
                  {(['week', 'month', 'year'] as TimeFrame[]).map((period: TimeFrame) => (
                    <button
                      key={period}
                      onClick={() => setTimeFrame(period)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                        timeFrame === period
                          ? 'bg-white text-blue-600 shadow-sm transform scale-105'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bookingsData[timeFrame]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                  />
                  <Bar dataKey="bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Main Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4 lg:gap-6 mb-8">
          <Card
            onClick={() => navigate("/dashboard/sub-admin/shooter-data")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:from-blue-100 hover:to-blue-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-900">Total Users</CardTitle>
              <Users className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-blue-200 h-6 w-16 rounded"></div>
                ) : (
                  totalUsers.toLocaleString()
                )}
              </div>
              <p className="text-xs text-blue-700 mt-1">Shooters + Range Owners</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate("/dashboard/sub-admin/range-owners")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:from-green-100 hover:to-green-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-900">
                Range Owners
              </CardTitle>
              <Shield className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-green-200 h-6 w-12 rounded"></div>
                ) : (
                  counts.rangeOwners
                )}
              </div>
              <p className="text-xs text-green-700 mt-1">Registered owners</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/dashboard/sub-admin/shop")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:from-purple-100 hover:to-purple-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-purple-900">Products</CardTitle>
              <Package className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-purple-200 h-6 w-16 rounded"></div>
                ) : (
                  counts.products.toLocaleString()
                )}
              </div>
              <p className="text-xs text-purple-700 mt-1">Total products</p>
            </CardContent>
          </Card>

          <Card 
            onClick={() => navigate("/dashboard/sub-admin/ranges")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:from-red-100 hover:to-red-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-900">
                Active Ranges
              </CardTitle>
              <MapPin className="h-5 w-5 text-red-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-red-200 h-6 w-12 rounded"></div>
                ) : (
                  counts.ranges
                )}
              </div>
              <p className="text-xs text-red-700 mt-1">Total ranges</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/dashboard/sub-admin/events")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 hover:from-indigo-100 hover:to-indigo-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-indigo-900">
                Total Events
              </CardTitle>
              <Globe className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-indigo-200 h-6 w-12 rounded"></div>
                ) : (
                  counts.events
                )}
              </div>
              <p className="text-xs text-indigo-700 mt-1">All events</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/dashboard/sub-admin/deletion-requests")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">
                Deletion Requests
              </CardTitle>
              <FileX className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-orange-200 h-6 w-16 rounded"></div>
                ) : (
                  counts.actions.toLocaleString()
                )}
              </div>
              <p className="text-xs text-orange-700 mt-1">Pending requests</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/dashboard/sub-admin/kyc-requests")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200 hover:from-cyan-100 hover:to-cyan-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-cyan-900">
                KYC Requests
              </CardTitle>
              <FileCheck className="h-5 w-5 text-cyan-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-cyan-200 h-6 w-12 rounded"></div>
                ) : (
                  counts.kycRequests
                )}
              </div>
              <p className="text-xs text-cyan-700 mt-1">Pending verification</p>
            </CardContent>
          </Card>

          <Card
            onClick={() => navigate("/dashboard/sub-admin/billing")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:from-emerald-100 hover:to-emerald-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900">
                Bills & Subscriptions
              </CardTitle>
              <CreditCard className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-emerald-200 h-6 w-16 rounded"></div>
                ) : (
                  counts.billsandsubscriptions.toLocaleString()
                )}
              </div>
              <p className="text-xs text-emerald-700 mt-1">Active subscriptions</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* CMB Accounts Management */}
          <Card className="bg-white/70 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                  <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    CMB Accounts
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Manage CMB user accounts ({cmbAccounts.length} total)
                    <span className="inline-flex items-center gap-1 text-green-600 ml-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      Live updates
                    </span>
                  </CardDescription>
                </div>

                {/* Add CMB Account Modal */}
                <Dialog open={isCmbModalOpen} onOpenChange={setIsCmbModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-200">
                      <Plus className="h-4 w-4" />
                      Add CMB Account
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        Add New CMB Account
                      </DialogTitle>
                      <DialogDescription>
                        Create a new CMB user account with username, email, and password.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cmb_username">Username</Label>
                        <Input
                          id="cmb_username"
                          value={newCmbAccount.username}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setNewCmbAccount(prev => ({...prev, username: e.target.value.toLowerCase()}))
                          }
                          placeholder="Enter username"
                          disabled={isCreatingCmb}
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">Only letters, numbers, and underscores allowed</p>
                      </div>
                      <div>
                        <Label htmlFor="cmb_email">Email</Label>
                        <Input
                          id="cmb_email"
                          type="email"
                          value={newCmbAccount.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setNewCmbAccount(prev => ({...prev, email: e.target.value}))
                          }
                          placeholder="Enter email address"
                          disabled={isCreatingCmb}
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cmb_password">Password</Label>
                        <div className="relative">
                          <Input
                            id="cmb_password"
                            type={showCmbPassword ? "text" : "password"}
                            value={newCmbAccount.password}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                              setNewCmbAccount(prev => ({...prev, password: e.target.value}))
                            }
                            placeholder="Enter password (min. 6 characters)"
                            disabled={isCreatingCmb}
                            className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCmbPassword(!showCmbPassword)}
                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 transition-colors"
                            disabled={isCreatingCmb}
                          >
                            {showCmbPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsCmbModalOpen(false);
                          setNewCmbAccount({ username: "", email: "", password: "" });
                          setError("");
                        }}
                        disabled={isCreatingCmb}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateCmbAccount} 
                        disabled={isCreatingCmb}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isCreatingCmb ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Creating...
                          </div>
                        ) : (
                          "Create Account"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCmbAccounts ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="text-gray-600">Loading accounts...</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Username</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Email</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Created At</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Last Login</th>
                        <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cmbAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-3">
                              <Users className="h-12 w-12 text-gray-300" />
                              <p className="font-medium">No CMB accounts found</p>
                              <p className="text-sm">Create your first account above.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        cmbAccounts.map((account: CmbAccount) => (
                          <tr key={account.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-4 font-medium text-gray-900">{account.username}</td>
                            <td className="py-4 px-4 text-gray-700">{account.email}</td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                                  {getStatusIcon(account.status)}
                                  {account.status}
                                </span>
                                {account.status !== 'deleted' && (
                                  <div className="relative">
                                    <select
                                      value={account.status}
                                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                        const newStatus = e.target.value as Exclude<AccountStatus, 'deleted'>;
                                        handleCmbStatusUpdate(account.id, newStatus);
                                      }}
                                      disabled={updatingStatus[account.id]}
                                      className="text-xs border border-gray-300 rounded-md px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 transition-all"
                                    >
                                      <option value="active">Active</option>
                                      <option value="inactive">Inactive</option>
                                      <option value="suspended">Suspended</option>
                                    </select>
                                    {updatingStatus[account.id] && (
                                      <RefreshCw className="absolute right-1 top-1.5 h-3 w-3 animate-spin text-blue-500" />
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-gray-600">
                              {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="py-4 px-4 text-gray-600">
                              {account.lastLogin ? new Date(account.lastLogin).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="py-4 px-4">
                              <button
                                onClick={() => handleDeleteCmbAccount(account.id, account.username)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-full transition-all duration-200 hover:scale-110"
                                title={`Delete ${account.username}`}
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* System Statistics */}
          <Card className="bg-white/70 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-6 w-6 text-purple-600" />
                System Statistics
              </CardTitle>
              <CardDescription>Overall platform metrics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Shooters</span>
                    <span className="text-sm font-semibold text-blue-600">
                      {counts.loading ? (
                        <div className="animate-pulse bg-blue-200 h-4 w-16 rounded"></div>
                      ) : (
                        `${counts.shooters} (${shootersPercentage}%)`
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${shootersPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Range Owners</span>
                    <span className="text-sm font-semibold text-green-600">
                      {counts.loading ? (
                        <div className="animate-pulse bg-green-200 h-4 w-16 rounded"></div>
                      ) : (
                        `${counts.rangeOwners} (${rangeOwnersPercentage}%)`
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${rangeOwnersPercentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Ranges</span>
                    <span className="text-sm font-semibold text-red-600">
                      {counts.loading ? (
                        <div className="animate-pulse bg-red-200 h-4 w-12 rounded"></div>
                      ) : (
                        counts.ranges
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full w-full transition-all duration-1000 ease-out"></div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Events</span>
                    <span className="text-sm font-semibold text-purple-600">
                      {counts.loading ? (
                        <div className="animate-pulse bg-purple-200 h-4 w-12 rounded"></div>
                      ) : (
                        counts.events
                      )}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full w-full transition-all duration-1000 ease-out"></div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold mb-4 text-gray-800 flex items-center gap-2">
                    <Package className="h-4 w-4 text-indigo-600" />
                    Collection Summary
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-blue-700 font-medium">Shooters</p>
                      <p className="text-blue-900 font-bold text-lg">
                        {counts.loading ? "..." : counts.shooters}
                      </p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                      <p className="text-green-700 font-medium">Range Owners</p>
                      <p className="text-green-900 font-bold text-lg">
                        {counts.loading ? "..." : counts.rangeOwners}
                      </p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                      <p className="text-red-700 font-medium">Ranges</p>
                      <p className="text-red-900 font-bold text-lg">
                        {counts.loading ? "..." : counts.ranges}
                      </p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                      <p className="text-purple-700 font-medium">Events</p>
                      <p className="text-purple-900 font-bold text-lg">
                        {counts.loading ? "..." : counts.events}
                      </p>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                      <p className="text-emerald-700 font-medium">CMB Accounts</p>
                      <p className="text-emerald-900 font-bold text-lg">
                        {loadingCmbAccounts ? "..." : cmbAccounts.length}
                      </p>
                    </div>
                    <div className="bg-cyan-50 p-3 rounded-lg border border-cyan-200">
                      <p className="text-cyan-700 font-medium">KYC Requests</p>
                      <p className="text-cyan-900 font-bold text-lg">
                        {counts.loading ? "..." : counts.kycRequests}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default SubAdminDashboard;
import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
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
import { User } from "firebase/auth";
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
  Edit,
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
  Package
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Type definitions
type UserRole = 'admin' | 'sub_admin' | 'shooter' | 'range_owner';

interface SubAdmin {
  id: string;
  username: string;
  email: string;
  uid: string;
  role: string;
  active: boolean;
  createdAt: Timestamp | Date | null;
  createdBy?: string;
  updatedAt?: Timestamp | Date | null;
  updatedBy?: string;
}

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
  loading: boolean;
}

interface NewSubAdminForm {
  username: string;
  email: string;
  password: string;
}

interface EditSubAdminForm {
  username: string;
  email: string;
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

const AdminDashboard: React.FC = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  // Role-based access control
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const role = user.displayName?.split('|')[1] as UserRole;
    if (role !== 'admin') {
      // Redirect non-admin users
      console.warn('Unauthorized access attempt to admin dashboard');
      navigate("/");
      return;
    }
  }, [user, navigate]);

  // State for storing counts
  const [counts, setCounts] = useState<Counts>({
    shooters: 0,
    rangeOwners: 0,
    ranges: 0,
    products:0,
    events: 0,
    actions: 0,
    billsandsubscriptions: 0,
    loading: true
  });

  // State for sub-admins
  const [subAdmins, setSubAdmins] = useState<SubAdmin[]>([]);
  const [loadingSubAdmins, setLoadingSubAdmins] = useState<boolean>(true);

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

  // State for add sub-admin modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newSubAdmin, setNewSubAdmin] = useState<NewSubAdminForm>({
    username: "",
    email: "",
    password: ""
  });
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // State for CMB account modal
  const [isCmbModalOpen, setIsCmbModalOpen] = useState<boolean>(false);
  const [newCmbAccount, setNewCmbAccount] = useState<CmbAccountForm>({
    username: "",
    email: "",
    password: ""
  });
  const [isCreatingCmb, setIsCreatingCmb] = useState<boolean>(false);
  const [showCmbPassword, setShowCmbPassword] = useState<boolean>(false);

  // State for edit sub-admin modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState<SubAdmin | null>(null);
  const [editSubAdmin, setEditSubAdmin] = useState<EditSubAdminForm>({
    username: "",
    email: ""
  });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

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
    if (!user?.displayName) return { name: user?.email || 'Admin', role: 'admin' };
    const [name, role] = user.displayName.split('|');
    return { name: name || user.email || 'Admin', role: role as UserRole || 'admin' };
  };

  const { name: userName, role: userRole } = getUserInfo();

  // Early return if not admin
  if (user && userRole !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-xl text-red-600">Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access the admin dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => navigate("/")} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
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
        const billsCount = actionsSnapshot.size;


        const subscriptionsSnapshot = await getDocs(collection(db, "subscriptions"));
        const subscriptionsCount = actionsSnapshot.size;


        const billsandsubscriptions = billsCount + subscriptionsCount;

        
        

        // Query events collection
        const eventsSnapshot = await getDocs(collection(db, "events"));
        const eventsCount = eventsSnapshot.size;

        // Update state with fetched counts
        setCounts({
          shooters: shootersCount,
          rangeOwners: rangeOwnersCount,
          ranges: rangesCount,
          products: productsCount,
          actions: actionsCount,
          billsandsubscriptions: billsandsubscriptions,
          events: eventsCount,
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

  // Fetch sub-admins directly from Firestore
  const fetchSubAdmins = async (): Promise<void> => {
    try {
      setLoadingSubAdmins(true);
      const subAdminsQuery = query(
        collection(db, "sub-admin"),
        orderBy('createdAt', 'desc')
      );
      const subAdminsSnapshot = await getDocs(subAdminsQuery);
      const subAdminsData: SubAdmin[] = subAdminsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as SubAdmin));
      setSubAdmins(subAdminsData);
      setError("");
    } catch (error) {
      console.error("Error fetching sub-admins:", error);
      setError("Error fetching sub-admins: " + (error as Error).message);
    } finally {
      setLoadingSubAdmins(false);
    }
  };

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

  useEffect(() => {
    fetchSubAdmins();
  }, []);

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

  // Handle creating new sub-admin using Firebase Functions HTTP endpoint
  const handleCreateSubAdmin = async (): Promise<void> => {
    if (!newSubAdmin.username || !newSubAdmin.email || !newSubAdmin.password) {
      setError("Please fill in all fields");
      return;
    }

    if (newSubAdmin.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    if (!user) {
      setError("You must be logged in as an admin");
      return;
    }

    setIsCreating(true);
    setError("");
    setSuccess("");

    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/createSubAdmin`, {
        method: 'POST',
        body: JSON.stringify({
          username: newSubAdmin.username,
          email: newSubAdmin.email,
          password: newSubAdmin.password
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSuccess("Sub-admin created successfully!");
        setNewSubAdmin({ username: "", email: "", password: "" });
        setIsAddModalOpen(false);
        await fetchSubAdmins();
      } else {
        setError(result.message || "Error creating sub-admin");
      }
    } catch (error: any) {
      console.error("Error creating sub-admin:", error);
      setError("❌ " + error.message);
    } finally {
      setIsCreating(false);
    }
  };

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

  // Handle deleting sub-admin using Firebase Functions HTTP endpoint
  const handleDeleteSubAdmin = async (subAdminId: string): Promise<void> => {
    if (!confirm("Are you sure you want to delete this sub-admin? This action cannot be undone.")) {
      return;
    }

    if (!user) {
      setError("You must be logged in as an admin");
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/deleteSubAdmin`, {
        method: 'POST',
        body: JSON.stringify({
          subAdminId: subAdminId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        setSuccess("Sub-admin deleted successfully!");
        await fetchSubAdmins();
      } else {
        setError(result.message || "Error deleting sub-admin");
      }
    } catch (error: any) {
      console.error("Error deleting sub-admin:", error);
      setError("❌ " + error.message);
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

  // Handle editing sub-admin
  const handleEditSubAdmin = (admin: SubAdmin): void => {
    setEditingSubAdmin(admin);
    setEditSubAdmin({
      username: admin.username,
      email: admin.email
    });
    setIsEditModalOpen(true);
  };

  // Handle updating sub-admin (directly in Firestore)
  const handleUpdateSubAdmin = async (): Promise<void> => {
    if (!editSubAdmin.username || !editSubAdmin.email) {
      setError("Please fill in all fields");
      return;
    }

    if (!editingSubAdmin || !user) {
      setError("Invalid operation");
      return;
    }

    setIsUpdating(true);
    setError("");
    setSuccess("");

    try {
      await updateDoc(doc(db, "sub-admin", editingSubAdmin.id), {
        username: editSubAdmin.username,
        email: editSubAdmin.email,
        updatedAt: new Date(),
        updatedBy: user.uid
      });

      setSuccess("Sub-admin updated successfully!");
      setEditSubAdmin({ username: "", email: "" });
      setEditingSubAdmin(null);
      setIsEditModalOpen(false);
      await fetchSubAdmins();
    } catch (error) {
      console.error("Error updating sub-admin:", error);
      setError("Error updating sub-admin: " + (error as Error).message);
    } finally {
      setIsUpdating(false);
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
                Admin Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">Manage your platform with ease</p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border">
                <span className="font-medium">{userName}</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
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
            onClick={() => navigate("/dashboard/admin/shooter-data")}
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
            onClick={() => navigate("/dashboard/admin/range-owners")}
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
            onClick={() => navigate("/dashboard/admin/shop")}
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
            onClick={() => navigate("/dashboard/admin/ranges")}
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
            onClick={() => navigate("/dashboard/admin/events")}
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

          {/* New Deletion Requests Card */}
          <Card
            onClick={() => navigate("/dashboard/admin/deletion-requests")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:from-orange-100 hover:to-orange-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-900">
                Deletion Requests
              </CardTitle>
              <FileX className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-purple-200 h-6 w-16 rounded"></div>
                ) : (
                  counts.actions.toLocaleString()
                )}
              </div>
              <p className="text-xs text-orange-700 mt-1">Pending requests</p>
            </CardContent>
          </Card>

          {/* New Bills & Subscriptions Card */}
          <Card
            onClick={() => navigate("/dashboard/admin/billing")}
            className="group cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-300 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:from-emerald-100 hover:to-emerald-200"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-emerald-900">
                Bills & Subscriptions
              </CardTitle>
              <CreditCard className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-900">
                {counts.loading ? (
                  <div className="animate-pulse bg-purple-200 h-6 w-16 rounded"></div>
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

          {/* Sub-Admin Management and System Statistics */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
            <Card className="bg-white/70 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Shield className="h-6 w-6 text-green-600" />
                    Sub-Admin Management
                  </CardTitle>
                  <CardDescription className="text-base">Manage Sub-Administrators</CardDescription>
                </div>

                {/* Add Sub-Admin Modal */}
                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                  <DialogTrigger asChild>
                    <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700 shadow-lg hover:shadow-xl transition-all duration-200">
                      <Plus className="h-4 w-4" />
                      Add Sub-Admin
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-green-600" />
                        Add New Sub-Admin
                      </DialogTitle>
                      <DialogDescription>
                        Create a new sub-administrator account with username, email, and password.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="username">Username</Label>
                        <Input
                          id="username"
                          value={newSubAdmin.username}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setNewSubAdmin(prev => ({...prev, username: e.target.value}))
                          }
                          placeholder="Enter username"
                          disabled={isCreating}
                          className="transition-all duration-200 focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={newSubAdmin.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setNewSubAdmin(prev => ({...prev, email: e.target.value}))
                          }
                          placeholder="Enter email address"
                          disabled={isCreating}
                          className="transition-all duration-200 focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="password">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={newSubAdmin.password}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setNewSubAdmin(prev => ({...prev, password: e.target.value}))
                          }
                          placeholder="Enter password (min. 6 characters)"
                          disabled={isCreating}
                          className="transition-all duration-200 focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsAddModalOpen(false);
                          setNewSubAdmin({ username: "", email: "", password: "" });
                          setError("");
                        }}
                        disabled={isCreating}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreateSubAdmin} 
                        disabled={isCreating}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {isCreating ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Creating...
                          </div>
                        ) : (
                          "Create Sub-Admin"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Edit Sub-Admin Modal */}
                <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Edit className="h-5 w-5 text-blue-600" />
                        Edit Sub-Admin
                      </DialogTitle>
                      <DialogDescription>
                        Update sub-administrator information.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="edit_username">Username</Label>
                        <Input
                          id="edit_username"
                          value={editSubAdmin.username}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setEditSubAdmin(prev => ({...prev, username: e.target.value}))
                          }
                          placeholder="Enter username"
                          disabled={isUpdating}
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_email">Email</Label>
                        <Input
                          id="edit_email"
                          type="email"
                          value={editSubAdmin.email}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                            setEditSubAdmin(prev => ({...prev, email: e.target.value}))
                          }
                          placeholder="Enter email address"
                          disabled={isUpdating}
                          className="transition-all duration-200 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditModalOpen(false);
                          setEditSubAdmin({ username: "", email: "" });
                          setEditingSubAdmin(null);
                          setError("");
                        }}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleUpdateSubAdmin} 
                        disabled={isUpdating}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isUpdating ? (
                          <div className="flex items-center gap-2">
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Updating...
                          </div>
                        ) : (
                          "Update Sub-Admin"
                        )}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Username</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Role</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                        <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingSubAdmins ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Loading sub-admins...
                            </div>
                          </td>
                        </tr>
                      ) : subAdmins.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center gap-3">
                              <Shield className="h-12 w-12 text-gray-300" />
                              <p className="font-medium">No sub-admins found</p>
                              <p className="text-sm">Create your first sub-admin above.</p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        subAdmins.map((admin: SubAdmin) => (
                          <tr key={admin.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="py-3 px-4 font-medium text-gray-900">{admin.username}</td>
                            <td className="py-3 px-4 text-gray-700">{admin.email}</td>
                            <td className="py-3 px-4">
                              <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800 font-medium">
                                {admin.role === 'sub_admin' ? 'Sub-Admin' : 'Sub-Admin'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                                admin.active !== false 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {admin.active !== false ? 'Active' : 'Inactive'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 px-2 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  onClick={() => handleEditSubAdmin(admin)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 px-2 text-red-600 hover:text-red-800 hover:bg-red-50 transition-colors"
                                  onClick={() => handleDeleteSubAdmin(admin.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
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
                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <p className="text-orange-700 font-medium">Sub-Admins</p>
                        <p className="text-orange-900 font-bold text-lg">
                          {loadingSubAdmins ? "..." : subAdmins.length}
                        </p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                        <p className="text-emerald-700 font-medium">CMB Accounts</p>
                        <p className="text-emerald-900 font-bold text-lg">
                          {loadingCmbAccounts ? "..." : cmbAccounts.length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
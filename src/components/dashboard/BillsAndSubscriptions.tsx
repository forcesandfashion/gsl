import { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { db } from "@/firebase/config";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  updateDoc,
  doc,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
  FileText, 
  CreditCard, 
  Calendar, 
  Download, 
  Filter,
  Search,
  CheckCircle,
  Clock,
  User,
  MapPin,
  Crown,
  DollarSign,
  CalendarDays,
  RefreshCw,
  Users,
  Target,
  Upload,
  Eye
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  planMonhips: number;
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

interface Shooter {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  rangeId: string;
  rangeName: string;
  subscriptionStatus: string;
  subscriptionEndDate: any;
  subscriptionType: string;
  createdAt: any;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  rangeId: string;
  rangeName: string;
  date: any;
  status: string;
  score?: string;
  notes?: string;
  createdAt: any;
}

// Attendance and Data Upload Component
const ShooterAttendanceAndData = ({ shooter, onClose }: { shooter: Shooter; onClose: () => void }) => {
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      // Fetch real attendance data from Firestore
      const attendanceRef = collection(db, "attendance");
      const attendanceQuery = query(
        attendanceRef,
        where("userId", "==", shooter.userId),
        where("rangeId", "==", shooter.rangeId),
        orderBy("date", "desc")
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceData: AttendanceRecord[] = [];
      
      attendanceSnapshot.forEach((doc) => {
        attendanceData.push({
          id: doc.id,
          ...doc.data()
        } as AttendanceRecord);
      });
      
      setAttendanceData(attendanceData);
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast({
        title: "Error",
        description: "Failed to load attendance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // Simulate file upload (you can implement actual file upload logic here)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Success",
        description: "Shooting data uploaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      event.target.value = ""; // Reset file input
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [shooter]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Shooter Details</h2>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Shooter Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Name:</strong> {shooter.userName}</p>
                  <p><strong>Email:</strong> {shooter.userEmail}</p>
                  <p><strong>Range:</strong> {shooter.rangeName}</p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <Badge className={
                      shooter.subscriptionStatus === "active" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }>
                      {shooter.subscriptionStatus.toUpperCase()}
                    </Badge>
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upload Shooting Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Upload CSV or PDF files containing shooting data from digital targets
                  </p>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <input
                      type="file"
                      accept=".csv,.pdf"
                      onChange={handleFileUpload}
                      disabled={uploading}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" disabled={uploading} asChild>
                        <span>
                          {uploading ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          {uploading ? "Uploading..." : "Choose File"}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-gray-500 mt-2">CSV or PDF files only</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <LoadingSpinner />
                </div>
              ) : attendanceData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No attendance records found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Date</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Score</th>
                        <th className="text-left py-2">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((record) => (
                        <tr key={record.id} className="border-b">
                          <td className="py-2">{formatDate(record.date)}</td>
                          <td className="py-2">
                            <Badge className={
                              record.status === "present" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }>
                              {record.status}
                            </Badge>
                          </td>
                          <td className="py-2">{record.score || "-"}</td>
                          <td className="py-2">{record.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default function BillsAndSubscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"bills" | "subscriptions" | "shooters">("bills");
  const [bills, setBills] = useState<Bill[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [shooters, setShooters] = useState<Shooter[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null);
  const [selectedShooter, setSelectedShooter] = useState<Shooter | null>(null);
  
  // Filter states
  const [billFilters, setBillFilters] = useState({
    search: "",
    paymentStatus: "all",
    dateRange: "all",
    rangeName: "all"
  });
  
  const [subscriptionFilters, setSubscriptionFilters] = useState({
    search: "",
    subscriptionStatus: "all",
    rangeName: "all"
  });

  const [shooterFilters, setShooterFilters] = useState({
    search: "",
    subscriptionStatus: "all",
    rangeName: "all"
  });

  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return "Invalid date";
    }
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string = "INR") => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Fetch bills for the current range owner
  const fetchBills = async () => {
    if (!user) return;
    
    try {
      const billsRef = collection(db, "bills");
      const q = query(
        billsRef, 
        where("rangeOwnerId", "==", user.uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      
      const billsData: Bill[] = [];
      querySnapshot.forEach((doc) => {
        billsData.push({
          id: doc.id,
          ...doc.data()
        } as Bill);
      });
      
      setBills(billsData);
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast({
        title: "Error",
        description: "Failed to load bills. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Fetch subscriptions for the current range owner
  const fetchSubscriptions = async () => {
    if (!user) return;
    
    try {
      // First get all ranges owned by this user
      const rangesRef = collection(db, "ranges");
      const rangesQuery = query(
        rangesRef, 
        where("ownerId", "==", user.uid)
      );
      const rangesSnapshot = await getDocs(rangesQuery);
      const rangeIds = rangesSnapshot.docs.map(doc => doc.id);

      if (rangeIds.length === 0) {
        setSubscriptions([]);
        return;
      }

      // Then get all subscriptions for these ranges
      const subscriptionsRef = collection(db, "subscriptions");
      const subscriptionsQuery = query(
        subscriptionsRef, 
        where("rangeId", "in", rangeIds),
        orderBy("createdAt", "desc")
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      
      const subscriptionsData: Subscription[] = [];
      subscriptionsSnapshot.forEach((doc) => {
        subscriptionsData.push({
          id: doc.id,
          ...doc.data()
        } as Subscription);
      });
      
      setSubscriptions(subscriptionsData);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Fetch shooters (users with subscriptions)
  const fetchShooters = async () => {
    if (!user) return;
    
    try {
      // Get all ranges owned by this user
      const rangesRef = collection(db, "ranges");
      const rangesQuery = query(
        rangesRef, 
        where("ownerId", "==", user.uid)
      );
      const rangesSnapshot = await getDocs(rangesQuery);
      const rangeIds = rangesSnapshot.docs.map(doc => doc.id);

      if (rangeIds.length === 0) {
        setShooters([]);
        return;
      }

      // Get all subscriptions for these ranges
      const subscriptionsRef = collection(db, "subscriptions");
      const subscriptionsQuery = query(
        subscriptionsRef, 
        where("rangeId", "in", rangeIds)
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      
      const shootersData: Shooter[] = [];
      subscriptionsSnapshot.forEach((doc) => {
        const sub = doc.data() as Subscription;
        shootersData.push({
          id: doc.id,
          userId: sub.userId,
          userName: sub.userName || sub.userEmail.split('@')[0],
          userEmail: sub.userEmail,
          rangeId: sub.rangeId,
          rangeName: sub.rangeName,
          subscriptionStatus: sub.subscriptionStatus,
          subscriptionEndDate: sub.endDate,
          subscriptionType: sub.planDuration,
          createdAt: sub.createdAt
        });
      });
      
      setShooters(shootersData);
    } catch (error) {
      console.error("Error fetching shooters:", error);
      toast({
        title: "Error",
        description: "Failed to load shooters. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Update payment status for a bill and activate subscription
  const updatePaymentStatus = async (billId: string, currentStatus: string) => {
    if (currentStatus !== "pending") return;
    
    setUpdatingPayment(billId);
    try {
      const bill = bills.find(b => b.id === billId);
      if (!bill) throw new Error("Bill not found");

      // Update bill payment status
      await updateDoc(doc(db, "bills", billId), {
        paymentStatus: "paid",
        updatedAt: Timestamp.now()
      });

      // Update local state
      setBills(prev => prev.map(bill => 
        bill.id === billId 
          ? { ...bill, paymentStatus: "paid", updatedAt: Timestamp.now() }
          : bill
      ));

      // If this is a subscription bill, update the subscription status
      if (bill.billType === "subscription") {
        let subscriptionId = bill.subscriptionId;

        // If no subscription ID, try to find subscription by userId and rangeId
        if (!subscriptionId) {
          const subscriptionsRef = collection(db, "subscriptions");
          const subscriptionQuery = query(
            subscriptionsRef,
            where("userId", "==", bill.userId),
            where("rangeId", "==", bill.rangeId),
            where("subscriptionStatus", "in", ["pending", "active"])
          );
          
          const subscriptionSnapshot = await getDocs(subscriptionQuery);
          if (!subscriptionSnapshot.empty) {
            subscriptionId = subscriptionSnapshot.docs[0].id;
          }
        }

        if (subscriptionId) {
          // Update subscription payment status to paid and set status to active
          await updateDoc(doc(db, "subscriptions", subscriptionId), {
            subscriptionStatus: "active",
            paymentStatus: "paid",
            updatedAt: Timestamp.now()
          });

          // Update local subscriptions state
          setSubscriptions(prev => prev.map(sub => 
            sub.id === subscriptionId 
              ? { 
                  ...sub, 
                  subscriptionStatus: "active", 
                  paymentStatus: "paid",
                  updatedAt: Timestamp.now() 
                }
              : sub
          ));

          // Update shooters list
          setShooters(prev => prev.map(shooter => 
            shooter.userId === bill.userId && shooter.rangeId === bill.rangeId
              ? { ...shooter, subscriptionStatus: "active" }
              : shooter
          ));
        }
      }

      toast({
        title: "Success",
        description: "Payment status updated and subscription activated"
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUpdatingPayment(null);
    }
  };

  // Filter bills based on current filters
  const filteredBills = bills.filter(bill => {
    if (billFilters.search) {
      const searchTerm = billFilters.search.toLowerCase();
      const matchesSearch = 
        bill.rangeName.toLowerCase().includes(searchTerm) ||
        bill.userName?.toLowerCase().includes(searchTerm) ||
        bill.userEmail.toLowerCase().includes(searchTerm) ||
        bill.billId.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
    }
    
    if (billFilters.paymentStatus !== "all" && bill.paymentStatus !== billFilters.paymentStatus) {
      return false;
    }
    
    if (billFilters.rangeName !== "all" && bill.rangeName !== billFilters.rangeName) {
      return false;
    }
    
    if (billFilters.dateRange !== "all") {
      const billDate = bill.billDate.toDate();
      const now = new Date();
      
      if (billFilters.dateRange === "today") {
        const isToday = billDate.toDateString() === now.toDateString();
        if (!isToday) return false;
      } else if (billFilters.dateRange === "week") {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (billDate < oneWeekAgo) return false;
      } else if (billFilters.dateRange === "month") {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (billDate < oneMonthAgo) return false;
      }
    }
    
    return true;
  });

  // Filter subscriptions based on current filters
  const filteredSubscriptions = subscriptions.filter(subscription => {
    if (subscriptionFilters.search) {
      const searchTerm = subscriptionFilters.search.toLowerCase();
      const matchesSearch = 
        subscription.rangeName.toLowerCase().includes(searchTerm) ||
        subscription.userEmail.toLowerCase().includes(searchTerm) ||
        subscription.userName?.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
    }
    
    if (subscriptionFilters.subscriptionStatus !== "all" && 
        subscription.subscriptionStatus !== subscriptionFilters.subscriptionStatus) {
      return false;
    }
    
    if (subscriptionFilters.rangeName !== "all" && 
        subscription.rangeName !== subscriptionFilters.rangeName) {
      return false;
    }
    
    return true;
  });

  // Filter shooters based on current filters
  const filteredShooters = shooters.filter(shooter => {
    if (shooterFilters.search) {
      const searchTerm = shooterFilters.search.toLowerCase();
      const matchesSearch = 
        shooter.userName.toLowerCase().includes(searchTerm) ||
        shooter.userEmail.toLowerCase().includes(searchTerm) ||
        shooter.rangeName.toLowerCase().includes(searchTerm);
      
      if (!matchesSearch) return false;
    }
    
    if (shooterFilters.subscriptionStatus !== "all" && 
        shooter.subscriptionStatus !== shooterFilters.subscriptionStatus) {
      return false;
    }
    
    if (shooterFilters.rangeName !== "all" && 
        shooter.rangeName !== shooterFilters.rangeName) {
      return false;
    }
    
    return true;
  });

  // Get unique range names for filter dropdowns
  const uniqueRangeNames = {
    bills: Array.from(new Set(bills.map(bill => bill.rangeName))),
    subscriptions: Array.from(new Set(subscriptions.map(sub => sub.rangeName))),
    shooters: Array.from(new Set(shooters.map(shooter => shooter.rangeName)))
  };

  // Print bill
  const printBill = (bill: Bill) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Bill ${bill.billId}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; }
              .header { text-align: center; margin-bottom: 20px; }
              .bill-details { margin-bottom: 20px; }
              .bill-details table { width: 100%; border-collapse: collapse; }
              .bill-details td { padding: 8px; border-bottom: 1px solid #ddd; }
              .bill-details td:first-child { font-weight: bold; width: 30%; }
              .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Shooting Range Bill</h1>
              <h2>${bill.rangeName}</h2>
            </div>
            <div class="bill-details">
              <table>
                <tr><td>Bill ID:</td><td>${bill.billId}</td></tr>
                <tr><td>Date:</td><td>${formatDate(bill.billDate)}</td></tr>
                <tr><td>Description:</td><td>${bill.description}</td></tr>
                <tr><td>User:</td><td>${bill.userName || bill.userEmail}</td></tr>
                <tr><td>Amount:</td><td>${formatCurrency(bill.amountPaid, bill.currency)}</td></tr>
                <tr><td>Payment Method:</td><td>${bill.paymentMethod}</td></tr>
                <tr><td>Payment Status:</td><td>${bill.paymentStatus}</td></tr>
                <tr><td>Plan Duration:</td><td>${bill.planDuration}</td></tr>
              </table>
            </div>
            <div class="footer">
              <p>Thank you for your business!</p>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchBills(), fetchSubscriptions(), fetchShooters()]);
      setLoading(false);
    };

    if (user) {
      loadData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
                <CreditCard className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                Bills & Subscriptions
              </h1>
              <p className="text-gray-600 mt-1 text-sm md:text-base">
                Manage your range's financial records, subscriptions, and shooters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="bills" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Bills</span> ({bills.length})
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-2">
              <Crown className="w-4 h-4" />
              <span className="hidden sm:inline">Subscriptions</span> ({subscriptions.length})
            </TabsTrigger>
            <TabsTrigger value="shooters" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Shooters</span> ({shooters.length})
            </TabsTrigger>
          </TabsList>

          {/* Bills Tab */}
          <TabsContent value="bills">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filter Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="search"
                        placeholder="Search bills..."
                        className="pl-9"
                        value={billFilters.search}
                        onChange={(e) => setBillFilters({...billFilters, search: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="paymentStatus">Payment Status</Label>
                    <Select
                      value={billFilters.paymentStatus}
                      onValueChange={(value) => setBillFilters({...billFilters, paymentStatus: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dateRange">Date Range</Label>
                    <Select
                      value={billFilters.dateRange}
                      onValueChange={(value) => setBillFilters({...billFilters, dateRange: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This Week</SelectItem>
                        <SelectItem value="month">This Month</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="rangeName">Range Name</Label>
                    <Select
                      value={billFilters.rangeName}
                      onValueChange={(value) => setBillFilters({...billFilters, rangeName: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ranges</SelectItem>
                        {uniqueRangeNames.bills.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredBills.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bills Found</h3>
                  <p className="text-gray-500">
                    {bills.length === 0 
                      ? "You don't have any bills yet." 
                      : "No bills match your current filters."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredBills.map((bill) => (
                  <Card key={bill.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-500" />
                          Bill: {bill.billId}
                        </CardTitle>
                        <Badge className={
                          bill.paymentStatus === "paid" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-yellow-100 text-yellow-800"
                        }>
                          {bill.paymentStatus.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{bill.description}</p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Date</p>
                          <p className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(bill.billDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Amount</p>
                          <p className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            {formatCurrency(bill.amountPaid, bill.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">User</p>
                          <p className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-40" />
                            {bill.userName || bill.userEmail}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Range</p>
                          <p className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {bill.rangeName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => printBill(bill)}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Print Bill
                        </Button>
                        
                        {bill.paymentMethod === "cash" && bill.paymentStatus === "pending" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updatePaymentStatus(bill.id, bill.paymentStatus)}
                            disabled={updatingPayment === bill.id}
                          >
                            {updatingPayment === bill.id ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            )}
                            Mark as Paid
                          </Button>
                        )}
                        
                        {bill.paymentMethod !== "cash" && (
                          <span className="text-sm text-gray-500 flex items-center">
                            <Clock className="w-4 h-4 mr-1" />
                            Automatic payment processing
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filter Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="subSearch">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="subSearch"
                        placeholder="Search subscriptions..."
                        className="pl-9"
                        value={subscriptionFilters.search}
                        onChange={(e) => setSubscriptionFilters({...subscriptionFilters, search: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="subStatus">Subscription Status</Label>
                    <Select
                      value={subscriptionFilters.subscriptionStatus}
                      onValueChange={(value) => setSubscriptionFilters({...subscriptionFilters, subscriptionStatus: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subRangeName">Range Name</Label>
                    <Select
                      value={subscriptionFilters.rangeName}
                      onValueChange={(value) => setSubscriptionFilters({...subscriptionFilters, rangeName: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ranges</SelectItem>
                        {uniqueRangeNames.subscriptions.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredSubscriptions.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subscriptions Found</h3>
                  <p className="text-gray-500">
                    {subscriptions.length === 0 
                      ? "You don't have any subscriptions yet." 
                      : "No subscriptions match your current filters."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredSubscriptions.map((subscription) => (
                  <Card key={subscription.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Crown className="w-5 h-5 text-yellow-500" />
                          {subscription.planDuration} Subscription
                        </CardTitle>
                        <Badge className={
                          subscription.subscriptionStatus === "active" 
                            ? "bg-green-100 text-green-800" 
                            : subscription.subscriptionStatus === "expired"
                            ? "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-800"
                        }>
                          {subscription.subscriptionStatus.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(subscription.price)} • {subscription.planDuration}
                      </p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Start Date</p>
                          <p className="flex items-center gap-1">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            {formatDate(subscription.startDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">End Date</p>
                          <p className="flex items-center gap-1">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            {formatDate(subscription.endDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">User</p>
                          <p className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-400" />
                            {subscription.userEmail}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Range</p>
                          <p className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {subscription.rangeName}
                          </p>
                        </div>
                      </div>
                      
                      {subscription.features && subscription.features.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-500 mb-2">Features</p>
                          <div className="flex flex-wrap gap-2">
                            {subscription.features.map((feature, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-sm font-medium text-gray-500 mb-2">Payment Details</p>
                        <div className="flex flex-wrap items-center gap-4">
                          <span className="text-sm">
                            Method: <Badge variant="outline">{subscription.paymentMethod}</Badge>
                          </span>
                          <span className="text-sm">
                            Status: <Badge variant="outline" className={
                              subscription.paymentStatus === "paid" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }>
                              {subscription.paymentStatus}
                            </Badge>
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Shooters Tab */}
          <TabsContent value="shooters">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filter Shooters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="shooterSearch">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                      <Input
                        id="shooterSearch"
                        placeholder="Search shooters..."
                        className="pl-9"
                        value={shooterFilters.search}
                        onChange={(e) => setShooterFilters({...shooterFilters, search: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="shooterStatus">Subscription Status</Label>
                    <Select
                      value={shooterFilters.subscriptionStatus}
                      onValueChange={(value) => setShooterFilters({...shooterFilters, subscriptionStatus: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="shooterRangeName">Range Name</Label>
                    <Select
                      value={shooterFilters.rangeName}
                      onValueChange={(value) => setShooterFilters({...shooterFilters, rangeName: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ranges</SelectItem>
                        {uniqueRangeNames.shooters.map(name => (
                          <SelectItem key={name} value={name}>{name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredShooters.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shooters Found</h3>
                  <p className="text-gray-500">
                    {shooters.length === 0 
                      ? "You don't have any shooters yet." 
                      : "No shooters match your current filters."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {filteredShooters.map((shooter) => (
                  <Card key={shooter.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-5 h-5 text-blue-500" />
                          {shooter.userName}
                        </CardTitle>
                        <Badge className={
                          shooter.subscriptionStatus === "active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }>
                          {shooter.subscriptionStatus.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{shooter.userEmail}</p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Range</p>
                          <p className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {shooter.rangeName}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Subscription Type</p>
                          <p className="flex items-center gap-1">
                            <Crown className="w-4 h-4 text-gray-400" />
                            {shooter.subscriptionType}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">End Date</p>
                          <p className="flex items-center gap-1">
                            <CalendarDays className="w-4 h-4 text-gray-400" />
                            {formatDate(shooter.subscriptionEndDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Member Since</p>
                          <p className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(shooter.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setSelectedShooter(shooter)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details & Data
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Shooter Details Modal */}
      {selectedShooter && (
        <ShooterAttendanceAndData 
          shooter={selectedShooter} 
          onClose={() => setSelectedShooter(null)} 
        />
      )}
    </div>
  );
}
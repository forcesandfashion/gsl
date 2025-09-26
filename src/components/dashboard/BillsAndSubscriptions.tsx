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
  Timestamp,
  addDoc
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
  Upload,
  Eye,
  X
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
  date: string;
  checkInTime: string;
  status: string;
  subscriptionId: string;
  timestamp: any;
  userEmail: string;
}

interface Range {
  id: string;
  name: string;
  ownerId: string;
}

// Enhanced Attendance and Data Upload Component
const ShooterAttendanceAndData = ({ shooter, onClose, ranges }: { 
  shooter: Shooter; 
  onClose: () => void; 
  ranges: Range[];
}) => {
  const { user } = useAuth();
  const [attendanceData, setAttendanceData] = useState<AttendanceRecord[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedAttendanceForUpload, setSelectedAttendanceForUpload] = useState<AttendanceRecord | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [showRangeSelection, setShowRangeSelection] = useState(false);
  const { toast } = useToast();

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  console.log("hello world")

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return "Invalid date";
    }
  };

  // Parse CSV data
  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      if (values.length === headers.length) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        data.push(row);
      }
    }

    return data;
  };

  // Upload CSV data to selected attendance
  const uploadCsvToAttendance = async (attendanceRecord: AttendanceRecord, csvData: any[]) => {
    setUploading(true);
    try {
      // Store CSV data in a subcollection under the attendance document
      const attendanceRef = doc(db, "attendance", attendanceRecord.id);
      const csvDataRef = collection(attendanceRef, "shootingData");
      
      // Upload each row of CSV data
      for (const row of csvData) {
        await addDoc(csvDataRef, {
          ...row,
          uploadedAt: Timestamp.now(),
          uploadedBy: user?.uid,
          attendanceId: attendanceRecord.id,
          shooterId: attendanceRecord.userId,
          rangeId: attendanceRecord.rangeId
        });
      }

      toast({
        title: "Success",
        description: `CSV data uploaded to ${attendanceRecord.rangeName} attendance for ${formatDate(attendanceRecord.date)}`
      });

      setSelectedAttendanceForUpload(null);
      setCsvData([]);
      setShowRangeSelection(false);
    } catch (error) {
      console.error("Error uploading CSV:", error);
      toast({
        title: "Error",
        description: "Failed to upload CSV data",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  // Fetch attendance data for the shooter from all ranges owned by the current user
  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const rangeIds = ranges.map(range => range.id);
      
      if (rangeIds.length === 0) {
        setAttendanceData([]);
        setTodayAttendance([]);
        return;
      }

      const attendanceRef = collection(db, "attendance");
      const attendanceQuery = query(
        attendanceRef,
        where("userId", "==", shooter.userId),
        where("rangeId", "in", rangeIds) // Only get attendance from user's ranges
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const allAttendance: AttendanceRecord[] = [];
      const today = getTodayDate();
      const todayRecords: AttendanceRecord[] = [];
      
      attendanceSnapshot.forEach((doc) => {
        const record = {
          id: doc.id,
          ...doc.data()
        } as AttendanceRecord;
        
        allAttendance.push(record);
        
        // Check if this is today's attendance
        if (record.date === today) {
          todayRecords.push(record);
        }
      });
      
      // Sort by date in descending order
      allAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setAttendanceData(allAttendance);
      setTodayAttendance(todayRecords);
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

  // Handle CSV file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      
      if (parsed.length === 0) {
        toast({
          title: "Error",
          description: "CSV file appears to be empty or invalid",
          variant: "destructive"
        });
        return;
      }

      setCsvData(parsed);
      
      // If there are multiple attendance records for today, show selection
      if (todayAttendance.length > 1) {
        setUploading(false);
        setShowRangeSelection(true);
      } else if (todayAttendance.length === 1) {
        // Directly upload to the single attendance record
        await uploadCsvToAttendance(todayAttendance[0], parsed);
      } else {
        setUploading(false);
        toast({
          title: "No Attendance Found",
          description: "No attendance record found for today. Please ensure the shooter has checked in.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error processing CSV:", error);
      toast({
        title: "Error",
        description: "Failed to process CSV file",
        variant: "destructive"
      });
      setUploading(false);
    } finally {
      event.target.value = "";
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [shooter, ranges]);

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold">Shooter Details</h2>
              <Button variant="outline" onClick={onClose} size="sm">
                <X className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Close</span>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Shooter Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-medium text-gray-600">Name</p>
                      <p className="font-semibold">{shooter.userName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Email</p>
                      <p className="font-semibold break-all">{shooter.userEmail}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Range</p>
                      <p className="font-semibold">{shooter.rangeName}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600">Status</p>
                      <Badge className={
                        shooter.subscriptionStatus === "active" 
                          ? "bg-green-100 text-green-800" 
                          : "bg-red-100 text-red-800"
                      }>
                        {shooter.subscriptionStatus.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Upload Shooting Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Upload CSV files containing shooting data for today's attendance
                    </p>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 sm:p-6 text-center">
                      <Upload className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        disabled={uploading}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload">
                        <Button variant="outline" disabled={uploading} asChild size="sm">
                          <span>
                            {uploading ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4 mr-2" />
                            )}
                            {uploading ? "Processing..." : "Choose CSV File"}
                          </span>
                        </Button>
                      </label>
                      <p className="text-xs text-gray-500 mt-2">CSV files only</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Today's Attendance */}
            {todayAttendance.length > 0 && (
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Today's Attendance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {todayAttendance.map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                        <div>
                          <p className="font-medium text-green-800">{record.rangeName}</p>
                          <p className="text-sm text-green-600">Check-in: {record.checkInTime}</p>
                        </div>
                        <Badge className="bg-green-100 text-green-800">
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg">Attendance History</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAttendanceModal(true)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View All
                  </Button>
                </div>
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
                  <div className="space-y-2">
                    {attendanceData.slice(0, 5).map((record) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{record.rangeName}</p>
                          <p className="text-sm text-gray-600">{formatDate(record.date)} - {record.checkInTime}</p>
                        </div>
                        <Badge className={
                          record.status === "present" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                        }>
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                    {attendanceData.length > 5 && (
                      <p className="text-sm text-gray-500 text-center mt-3">
                        And {attendanceData.length - 5} more records...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Range Selection Modal for CSV Upload */}
      {showRangeSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-4">Select Attendance Record</h3>
              <p className="text-sm text-gray-600 mb-4">
                Multiple attendance records found for today. Please select which one to upload the CSV data to:
              </p>
              <div className="space-y-3">
                {todayAttendance.map((record) => (
                  <div
                    key={record.id}
                    className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-blue-50 hover:border-blue-300"
                    onClick={() => {
                      setSelectedAttendanceForUpload(record);
                      uploadCsvToAttendance(record, csvData);
                    }}
                  >
                    <p className="font-medium">{record.rangeName}</p>
                    <p className="text-sm text-gray-600">Check-in: {record.checkInTime}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRangeSelection(false);
                    setCsvData([]);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Attendance History Modal */}
      {showAttendanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-2 sm:p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Complete Attendance History</h3>
                <Button variant="outline" onClick={() => setShowAttendanceModal(false)} size="sm">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {attendanceData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No attendance records found
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2">Date</th>
                        <th className="text-left py-3 px-2">Range</th>
                        <th className="text-left py-3 px-2">Check-in Time</th>
                        <th className="text-left py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((record) => (
                        <tr key={record.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-2">{formatDate(record.date)}</td>
                          <td className="py-3 px-2">{record.rangeName}</td>
                          <td className="py-3 px-2">{record.checkInTime || "-"}</td>
                          <td className="py-3 px-2">
                            <Badge className={
                              record.status === "present" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-red-100 text-red-800"
                            }>
                              {record.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default function BillsAndSubscriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"bills" | "subscriptions" | "shooters">("bills");
  const [bills, setBills] = useState<Bill[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [shooters, setShooters] = useState<Shooter[]>([]);
  const [ranges, setRanges] = useState<Range[]>([]);
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

  // Fetch ranges owned by user
  const fetchRanges = async () => {
    if (!user) return;
    
    try {
      const rangesRef = collection(db, "ranges");
      const q = query(rangesRef, where("ownerId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      const rangesData: Range[] = [];
      querySnapshot.forEach((doc) => {
        rangesData.push({
          id: doc.id,
          name: doc.data().name,
          ownerId: doc.data().ownerId
        });
      });
      
      setRanges(rangesData);
    } catch (error) {
      console.error("Error fetching ranges:", error);
    }
  };

  // Fetch bills for the current range owner
  const fetchBills = async () => {
    if (!user) return;
    
    try {
      const billsRef = collection(db, "bills");
      const q = query(billsRef, where("rangeOwnerId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      
      const billsData: Bill[] = [];
      querySnapshot.forEach((doc) => {
        billsData.push({
          id: doc.id,
          ...doc.data()
        } as Bill);
      });
      
      // Sort by creation date (newest first)
      billsData.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
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
      const rangeIds = ranges.map(range => range.id);

      if (rangeIds.length === 0) {
        setSubscriptions([]);
        return;
      }

      const subscriptionsRef = collection(db, "subscriptions");
      const subscriptionsQuery = query(
        subscriptionsRef, 
        where("rangeId", "in", rangeIds)
      );
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      
      const subscriptionsData: Subscription[] = [];
      subscriptionsSnapshot.forEach((doc) => {
        subscriptionsData.push({
          id: doc.id,
          ...doc.data()
        } as Subscription);
      });
      
      // Sort by creation date (newest first)
      subscriptionsData.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
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
      const rangeIds = ranges.map(range => range.id);

      if (rangeIds.length === 0) {
        setShooters([]);
        return;
      }

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
      
      // Sort by creation date (newest first)
      shootersData.sort((a, b) => {
        const dateA = a.createdAt ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
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
          // Update subscription payment status to "done" instead of "paid"
          await updateDoc(doc(db, "subscriptions", subscriptionId), {
            subscriptionStatus: "active",
            paymentStatus: "done", // Changed from "paid" to "done"
            updatedAt: Timestamp.now()
          });

          // Update local subscriptions state
          setSubscriptions(prev => prev.map(sub => 
            sub.id === subscriptionId 
              ? { 
                  ...sub, 
                  subscriptionStatus: "active", 
                  paymentStatus: "done", // Changed from "paid" to "done"
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
      await fetchRanges();
    };

    if (user) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    const loadOtherData = async () => {
      if (ranges.length > 0) {
        await Promise.all([fetchBills(), fetchSubscriptions(), fetchShooters()]);
      }
      setLoading(false);
    };

    loadOtherData();
  }, [ranges]);

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                <CreditCard className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-blue-600" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
          <TabsList className="grid grid-cols-3 w-full mb-6">
            <TabsTrigger value="bills" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Bills</span>
              <span className="sm:hidden">({bills.length})</span>
              <span className="hidden sm:inline">({bills.length})</span>
            </TabsTrigger>
            <TabsTrigger value="subscriptions" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Subs</span>
              <span className="sm:hidden">({subscriptions.length})</span>
              <span className="hidden sm:inline">Subscriptions ({subscriptions.length})</span>
            </TabsTrigger>
            <TabsTrigger value="shooters" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Users</span>
              <span className="sm:hidden">({shooters.length})</span>
              <span className="hidden sm:inline">Shooters ({shooters.length})</span>
            </TabsTrigger>
          </TabsList>

          {/* Bills Tab */}
          <TabsContent value="bills">
            <Card className="mb-4 sm:mb-6">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                  Filter Bills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="search" className="text-sm">Search</Label>
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
                    <Label htmlFor="paymentStatus" className="text-sm">Payment Status</Label>
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
                    <Label htmlFor="dateRange" className="text-sm">Date Range</Label>
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
                    <Label htmlFor="rangeName" className="text-sm">Range Name</Label>
                    <Select
                      value={billFilters.rangeName}
                      onValueChange={(value) => setBillFilters({...billFilters, rangeName: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ranges</SelectItem>
                        {ranges.map(range => (
                          <SelectItem key={range.id} value={range.name}>{range.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredBills.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <FileText className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bills Found</h3>
                  <p className="text-gray-500">
                    {bills.length === 0 
                      ? "You don't have any bills yet." 
                      : "No bills match your current filters."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {filteredBills.map((bill) => (
                  <Card key={bill.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-3 sm:pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
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
                    <CardContent className="pt-3 sm:pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">Date</p>
                          <p className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {formatDate(bill.billDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">Amount</p>
                          <p className="flex items-center gap-1 text-sm">
                            <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {formatCurrency(bill.amountPaid, bill.currency)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">User</p>
                          <p className="flex items-center gap-1 text-sm truncate">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {bill.userName || bill.userEmail}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">Range</p>
                          <p className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {bill.rangeName}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-3 sm:pt-4 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => printBill(bill)}
                        >
                          <Download className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">Print</span>
                        </Button>
                        
                        {bill.paymentMethod === "cash" && bill.paymentStatus === "pending" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => updatePaymentStatus(bill.id, bill.paymentStatus)}
                            disabled={updatingPayment === bill.id}
                          >
                            {updatingPayment === bill.id ? (
                              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                            )}
                            <span className="text-xs sm:text-sm">Mark Paid</span>
                          </Button>
                        )}
                        
                        {bill.paymentMethod !== "cash" && (
                          <span className="text-xs sm:text-sm text-gray-500 flex items-center">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                            Auto processing
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
            <Card className="mb-4 sm:mb-6">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                  Filter Subscriptions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="subSearch" className="text-sm">Search</Label>
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
                    <Label htmlFor="subStatus" className="text-sm">Subscription Status</Label>
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
                    <Label htmlFor="subRangeName" className="text-sm">Range Name</Label>
                    <Select
                      value={subscriptionFilters.rangeName}
                      onValueChange={(value) => setSubscriptionFilters({...subscriptionFilters, rangeName: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ranges</SelectItem>
                        {ranges.map(range => (
                          <SelectItem key={range.id} value={range.name}>{range.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredSubscriptions.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <Crown className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subscriptions Found</h3>
                  <p className="text-gray-500">
                    {subscriptions.length === 0 
                      ? "You don't have any subscriptions yet." 
                      : "No subscriptions match your current filters."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {filteredSubscriptions.map((subscription) => (
                  <Card key={subscription.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-3 sm:pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
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
                    <CardContent className="pt-3 sm:pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">Start Date</p>
                          <p className="flex items-center gap-1 text-sm">
                            <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {formatDate(subscription.startDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">End Date</p>
                          <p className="flex items-center gap-1 text-sm">
                            <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {formatDate(subscription.endDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">User</p>
                          <p className="flex items-center gap-1 text-sm truncate">
                            <User className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {subscription.userEmail}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">Range</p>
                          <p className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {subscription.rangeName}
                          </p>
                        </div>
                      </div>
                      
                      {subscription.features && subscription.features.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Features</p>
                          <div className="flex flex-wrap gap-2">
                            {subscription.features.map((feature, index) => (
                              <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="pt-3 sm:pt-4 border-t border-gray-100">
                        <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Payment Details</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <span className="text-xs sm:text-sm">
                            Method: <Badge variant="outline" className="text-xs">{subscription.paymentMethod}</Badge>
                          </span>
                          <span className="text-xs sm:text-sm">
                            Status: <Badge variant="outline" className={`text-xs ${
                              subscription.paymentStatus === "done" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
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
            <Card className="mb-4 sm:mb-6">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
                  Filter Shooters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div>
                    <Label htmlFor="shooterSearch" className="text-sm">Search</Label>
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
                    <Label htmlFor="shooterStatus" className="text-sm">Subscription Status</Label>
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
                    <Label htmlFor="shooterRangeName" className="text-sm">Range Name</Label>
                    <Select
                      value={shooterFilters.rangeName}
                      onValueChange={(value) => setShooterFilters({...shooterFilters, rangeName: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Ranges</SelectItem>
                        {ranges.map(range => (
                          <SelectItem key={range.id} value={range.name}>{range.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {filteredShooters.length === 0 ? (
              <Card>
                <CardContent className="py-8 sm:py-12 text-center">
                  <Users className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Shooters Found</h3>
                  <p className="text-gray-500">
                    {shooters.length === 0 
                      ? "You don't have any shooters yet." 
                      : "No shooters match your current filters."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:gap-6">
                {filteredShooters.map((shooter) => (
                  <Card key={shooter.id} className="overflow-hidden">
                    <CardHeader className="bg-gray-50 pb-3 sm:pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <User className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
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
                      <p className="text-sm text-gray-600 break-all">{shooter.userEmail}</p>
                    </CardHeader>
                    <CardContent className="pt-3 sm:pt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-4">
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">Range</p>
                          <p className="flex items-center gap-1 text-sm">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {shooter.rangeName}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">Subscription Type</p>
                          <p className="flex items-center gap-1 text-sm">
                            <Crown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {shooter.subscriptionType}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">End Date</p>
                          <p className="flex items-center gap-1 text-sm">
                            <CalendarDays className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {formatDate(shooter.subscriptionEndDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-medium text-gray-500">Member Since</p>
                          <p className="flex items-center gap-1 text-sm">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                            {formatDate(shooter.createdAt)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 pt-3 sm:pt-4 border-t border-gray-100">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setSelectedShooter(shooter)}
                        >
                          <Eye className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                          <span className="text-xs sm:text-sm">View Details</span>
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
          ranges={ranges}
        />
      )}
    </div>
  );
}
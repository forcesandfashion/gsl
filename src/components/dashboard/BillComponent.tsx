import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Search, Filter, Download, FileText, Calendar, User, MapPin, DollarSign, Clock, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/firebase/config';


// TypeScript interface
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

const BillsComponent: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    paymentStatus: 'all',
    dateRange: 'all'
  });

  useEffect(() => {
    const fetchBills = async () => {
      try {
        const billsRef = collection(db, 'bills');
        const billsQuery = query(billsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(billsQuery);
        
        const billsData: Bill[] = [];
        querySnapshot.forEach((doc) => {
          billsData.push({
            id: doc.id,
            ...doc.data()
          } as Bill);
        });
        
        setBills(billsData);
        setFilteredBills(billsData);
      } catch (error) {
        console.error('Error fetching bills:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, []);

  useEffect(() => {
    let result = bills;
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(bill => 
        bill.userName?.toLowerCase().includes(searchTerm) ||
        bill.userEmail.toLowerCase().includes(searchTerm) ||
        bill.rangeName.toLowerCase().includes(searchTerm) ||
        bill.billId.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply payment status filter
    if (filters.paymentStatus !== 'all') {
      result = result.filter(bill => bill.paymentStatus === filters.paymentStatus);
    }
    
    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      result = result.filter(bill => {
        const billDate = bill.billDate.toDate();
        
        if (filters.dateRange === 'today') {
          return billDate.toDateString() === now.toDateString();
        } else if (filters.dateRange === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return billDate >= oneWeekAgo;
        } else if (filters.dateRange === 'month') {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return billDate >= oneMonthAgo;
        }
        return true;
      });
    }
    
    setFilteredBills(result);
  }, [bills, filters]);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number, currency: string = "INR"): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const toggleExpandBill = (billId: string) => {
    if (expandedBill === billId) {
      setExpandedBill(null);
    } else {
      setExpandedBill(billId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bills Management</h2>
          <p className="text-gray-600 mt-1">View and manage all billing records</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
          <FileText className="h-4 w-4 text-blue-600" />
          <span className="font-medium">{filteredBills.length} bills found</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
            <Filter className="h-5 w-5" />
            Filter Bills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-blue-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-blue-500" />
                <Input
                  placeholder="Search bills..."
                  className="pl-9 border-blue-300 focus:border-blue-500"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block text-blue-700">Payment Status</label>
              <Select
                value={filters.paymentStatus}
                onValueChange={(value) => setFilters({...filters, paymentStatus: value})}
              >
                <SelectTrigger className="border-blue-300 focus:border-blue-500">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block text-blue-700">Date Range</label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters({...filters, dateRange: value})}
              >
                <SelectTrigger className="border-blue-300 focus:border-blue-500">
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
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      {filteredBills.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No bills found</h3>
            <p className="text-gray-500 text-center max-w-md">
              {bills.length === 0 ? 'No bills have been created yet.' : 'No bills match your current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredBills.map((bill) => (
            <Card key={bill.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
              <CardHeader 
                className={`pb-4 cursor-pointer ${expandedBill === bill.id ? 'bg-blue-50' : 'bg-gray-50'}`}
                onClick={() => toggleExpandBill(bill.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {bill.billId}
                        {expandedBill === bill.id ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{bill.description}</p>
                    </div>
                  </div>
                  <Badge className={
                    bill.paymentStatus === "paid" 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : "bg-yellow-100 text-yellow-800 border-yellow-200"
                  }>
                    {bill.paymentStatus.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              {expandedBill === bill.id && (
                <CardContent className="pt-4 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">Date</p>
                      <p className="flex items-center gap-1 font-medium">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        {formatDate(bill.billDate)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">Amount</p>
                      <p className="flex items-center gap-1 font-medium">
                        <DollarSign className="h-4 w-4 text-green-500" />
                        {formatCurrency(bill.amountPaid, bill.currency)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">User</p>
                      <p className="flex items-center gap-1 truncate font-medium">
                        <User className="h-4 w-4 text-purple-500" />
                        {bill.userName || bill.userEmail}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">Range</p>
                      <p className="flex items-center gap-1 font-medium">
                        <MapPin className="h-4 w-4 text-red-500" />
                        {bill.rangeName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                    <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </Button>
                    
                    {bill.paymentMethod === "cash" && bill.paymentStatus === "pending" && (
                      <div className="flex items-center gap-1 text-sm text-yellow-700 bg-yellow-50 px-3 py-1.5 rounded-md">
                        <Clock className="h-4 w-4" />
                        Awaiting payment
                      </div>
                    )}
                    
                    {bill.paymentMethod !== "cash" && (
                      <div className="flex items-center gap-1 text-sm text-green-700 bg-green-50 px-3 py-1.5 rounded-md">
                        <CheckCircle className="h-4 w-4" />
                        Auto processing
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default BillsComponent;
import React, { useState, useEffect } from 'react';
import { useAuth } from "@/firebase/auth";
import { db } from "@/firebase/config";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { useToast } from "@/components/ui/use-toast";
import { Receipt, Calendar, CreditCard, Clock, Filter, Download, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Bill {
  id: string;
  billId: string;
  subscriptionId: string;
  userId: string;
  userEmail: string;
  userName: string;
  rangeId: string;
  rangeName: string;
  rangeOwnerEmail?: string;
  rangeOwnerId?: string;
  planDuration: string;
  planMonths: number;
  amountPaid: number;
  paymentMethod: string;
  paymentStatus: string;
  billType: 'new_subscription' | 'subscription_extension';
  billStatus: string;
  billDate: any;
  createdAt: any;
  updatedAt: any;
  currency: string;
  description: string;
}

export default function ShooterBills() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [filteredBills, setFilteredBills] = useState<Bill[]>([]);
  const [filters, setFilters] = useState({
    paymentStatus: 'all',
    billType: 'all',
    year: 'all',
    range: 'all'
  });

  useEffect(() => {
    if (user) {
      loadBills();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [filters, bills]);

  const loadBills = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const billsRef = collection(db, "bills");
      const q = query(
        billsRef, 
        where("userId", "==", user.uid),
   
      );
      
      const querySnapshot = await getDocs(q);
      const billsData: Bill[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Bill, 'id'>;
        billsData.push({
          ...data,
          id: doc.id
        });
      });
      
      setBills(billsData);
      setFilteredBills(billsData);
    } catch (error) {
      console.error("Error loading bills:", error);
      toast({
        title: "Error",
        description: "Failed to load bills",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bills];

    if (filters.paymentStatus !== 'all') {
      filtered = filtered.filter(bill => bill.paymentStatus === filters.paymentStatus);
    }

    if (filters.billType !== 'all') {
      filtered = filtered.filter(bill => bill.billType === filters.billType);
    }

    if (filters.year !== 'all') {
      const targetYear = parseInt(filters.year);
      filtered = filtered.filter(bill => {
        const billDate = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
        return billDate.getFullYear() === targetYear;
      });
    }

    if (filters.range !== 'all') {
      filtered = filtered.filter(bill => bill.rangeId === filters.range);
    }

    setFilteredBills(filtered);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBillTypeBadge = (type: string) => {
    switch (type) {
      case 'new_subscription':
        return <Badge className="bg-blue-100 text-blue-800">New Subscription</Badge>;
      case 'subscription_extension':
        return <Badge className="bg-purple-100 text-purple-800">Extension</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'upi':
        return '📱';
      case 'card':
        return '💳';
      case 'cash':
        return '💵';
      case 'paypal':
        return '🅿️';
      default:
        return '💳';
    }
  };

  const calculateTotalAmount = () => {
    return filteredBills.reduce((total, bill) => total + bill.amountPaid, 0);
  };

  const years = [...new Set(bills.map(bill => {
    const date = bill.billDate?.toDate ? bill.billDate.toDate() : new Date(bill.billDate);
    return date.getFullYear();
  }))].sort((a, b) => b - a);

  const ranges = [...new Set(bills.map(bill => ({ id: bill.rangeId, name: bill.rangeName })))];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Total Bills</p>
                <p className="text-2xl font-bold text-blue-700">{filteredBills.length}</p>
              </div>
              <Receipt className="w-8 h-8 text-blue-700" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#ff6b6b]">Total Amount</p>
                <p className="text-2xl font-bold text-[#ff6b6b]">₹{calculateTotalAmount()}</p>
              </div>
              <CreditCard className="w-8 h-8 text-[#ff6b6b]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">Pending</p>
                <p className="text-2xl font-bold text-blue-700">
                  {filteredBills.filter(b => b.paymentStatus === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-700" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#ff6b6b]">Completed</p>
                <p className="text-2xl font-bold text-[#ff6b6b]">
                  {filteredBills.filter(b => b.paymentStatus === 'completed').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-[#ff6b6b]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Filter className="w-5 h-5 text-[#ff6b6b]" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-[#ff6b6b]">Payment Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => setFilters(prev => ({ ...prev, paymentStatus: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-[#ff6b6b]">Bill Type</label>
              <select
                value={filters.billType}
                onChange={(e) => setFilters(prev => ({ ...prev, billType: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="new_subscription">New Subscription</option>
                <option value="subscription_extension">Extension</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-[#ff6b6b]">Year</label>
              <select
                value={filters.year}
                onChange={(e) => setFilters(prev => ({ ...prev, year: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Years</option>
                {years.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-[#ff6b6b]">Range</label>
              <select
                value={filters.range}
                onChange={(e) => setFilters(prev => ({ ...prev, range: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Ranges</option>
                {ranges.map(range => (
                  <option key={range.id} value={range.id}>{range.name}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills List */}
      <div className="space-y-4">
        {filteredBills.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="w-16 h-16 text-[#ff6b6b] mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-blue-700 mb-2">No Bills Found</h3>
              <p className="text-blue-700">No bills match your current filters or you haven't made any payments yet.</p>
            </CardContent>
          </Card>
        ) : (
          filteredBills.map((bill) => (
            <Card key={bill.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{bill.rangeName}</h3>
                      {getBillTypeBadge(bill.billType)}
                      {getStatusBadge(bill.paymentStatus)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div className="space-y-1">
                        <p><strong>Bill ID:</strong> {bill.billId}</p>
                        <p><strong>Plan:</strong> {bill.planDuration} ({bill.planMonths} month{bill.planMonths > 1 ? 's' : ''})</p>
                        <p><strong>Payment Method:</strong> {getPaymentMethodIcon(bill.paymentMethod)} {bill.paymentMethod.toUpperCase()}</p>
                      </div>
                      <div className="space-y-1">
                        <p><strong>Date:</strong> {formatDate(bill.billDate)}</p>
                        <p><strong>Description:</strong> {bill.description}</p>
                        <p><strong>Currency:</strong> {bill.currency}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">₹{bill.amountPaid}</p>
                      <p className="text-sm text-gray-500">
                        ₹{Math.round(bill.amountPaid / bill.planMonths)}/month
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // View bill details
                          toast({
                            title: "Bill Details",
                            description: `Bill ID: ${bill.billId} - ${bill.description}`
                          });
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Download/Print bill
                          toast({
                            title: "Download",
                            description: "Bill download feature will be available soon"
                          });
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
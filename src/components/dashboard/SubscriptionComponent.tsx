import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Search, Filter, CreditCard, Calendar, User, MapPin, DollarSign, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {db} from '@/firebase/config';


// TypeScript interface
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

const SubscriptionsComponent: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [filteredSubscriptions, setFilteredSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSubscription, setExpandedSubscription] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    subscriptionStatus: 'all'
  });

  useEffect(() => {
    const fetchSubscriptions = async () => {
      try {
        const subscriptionsRef = collection(db, 'subscriptions');
        const subscriptionsQuery = query(subscriptionsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(subscriptionsQuery);
        
        const subscriptionsData: Subscription[] = [];
        querySnapshot.forEach((doc) => {
          subscriptionsData.push({
            id: doc.id,
            ...doc.data()
          } as Subscription);
        });
        
        setSubscriptions(subscriptionsData);
        setFilteredSubscriptions(subscriptionsData);
      } catch (error) {
        console.error('Error fetching subscriptions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubscriptions();
  }, []);

  useEffect(() => {
    let result = subscriptions;
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(subscription => 
        subscription.userName?.toLowerCase().includes(searchTerm) ||
        subscription.userEmail.toLowerCase().includes(searchTerm) ||
        subscription.rangeName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply subscription status filter
    if (filters.subscriptionStatus !== 'all') {
      result = result.filter(subscription => subscription.subscriptionStatus === filters.subscriptionStatus);
    }
    
    setFilteredSubscriptions(result);
  }, [subscriptions, filters]);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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

  const toggleExpandSubscription = (subscriptionId: string) => {
    if (expandedSubscription === subscriptionId) {
      setExpandedSubscription(null);
    } else {
      setExpandedSubscription(subscriptionId);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
          <p className="text-gray-600 mt-1">View and manage all subscription records</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-purple-50 px-3 py-2 rounded-lg">
          <CreditCard className="h-4 w-4 text-purple-600" />
          <span className="font-medium">{filteredSubscriptions.length} subscriptions found</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-purple-800">
            <Filter className="h-5 w-5" />
            Filter Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-purple-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-purple-500" />
                <Input
                  placeholder="Search subscriptions..."
                  className="pl-9 border-purple-300 focus:border-purple-500"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block text-purple-700">Subscription Status</label>
              <Select
                value={filters.subscriptionStatus}
                onValueChange={(value) => setFilters({...filters, subscriptionStatus: value})}
              >
                <SelectTrigger className="border-purple-300 focus:border-purple-500">
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
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      {filteredSubscriptions.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CreditCard className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No subscriptions found</h3>
            <p className="text-gray-500 text-center max-w-md">
              {subscriptions.length === 0 ? 'No subscriptions have been created yet.' : 'No subscriptions match your current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredSubscriptions.map((subscription) => (
            <Card key={subscription.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
              <CardHeader 
                className={`pb-4 cursor-pointer ${expandedSubscription === subscription.id ? 'bg-purple-50' : 'bg-gray-50'}`}
                onClick={() => toggleExpandSubscription(subscription.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Crown className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {subscription.planDuration} Plan
                        {expandedSubscription === subscription.id ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(subscription.price)} • {subscription.planMonths} months
                      </p>
                    </div>
                  </div>
                  <Badge className={
                    subscription.subscriptionStatus === "active" 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : subscription.subscriptionStatus === "expired"
                      ? "bg-red-100 text-red-800 border-red-200"
                      : "bg-gray-100 text-gray-800 border-gray-200"
                  }>
                    {subscription.subscriptionStatus.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              {expandedSubscription === subscription.id && (
                <CardContent className="pt-4 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">Start Date</p>
                      <p className="flex items-center gap-1 font-medium">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        {formatDate(subscription.startDate)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">End Date</p>
                      <p className="flex items-center gap-1 font-medium">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        {formatDate(subscription.endDate)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">User</p>
                      <p className="flex items-center gap-1 truncate font-medium">
                        <User className="h-4 w-4 text-purple-500" />
                        {subscription.userName || subscription.userEmail}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">Range</p>
                      <p className="flex items-center gap-1 font-medium">
                        <MapPin className="h-4 w-4 text-red-500" />
                        {subscription.rangeName}
                      </p>
                    </div>
                  </div>
                  
                  {subscription.features && subscription.features.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-500 mb-2">Features</p>
                      <div className="flex flex-wrap gap-2">
                        {subscription.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-2">Payment Details</p>
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-gray-600">Method:</span>
                        <Badge variant="outline" className="bg-gray-100">
                          {subscription.paymentMethod}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <span className="text-gray-600">Status:</span>
                        <Badge variant="outline" className={
                          subscription.paymentStatus === "paid" 
                            ? "bg-green-100 text-green-800 border-green-200" 
                            : "bg-yellow-100 text-yellow-800 border-yellow-200"
                        }>
                          {subscription.paymentStatus}
                        </Badge>
                      </div>
                    </div>
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

export default SubscriptionsComponent;
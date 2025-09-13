import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, User, MapPin, DollarSign, FileText, CreditCard, Clock, CheckCircle, XCircle, Download, Eye, Menu, X } from 'lucide-react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy
} from 'firebase/firestore';
import { db } from '../../firebase/config';

const BillsSubscriptionsComponent = () => {
  const [activeTab, setActiveTab] = useState('bills');
  const [bills, setBills] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [rangeFilter, setRangeFilter] = useState('');
  const [shooterFilter, setShooterFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [amountRange, setAmountRange] = useState({ min: '', max: '' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterData();
  }, [
    activeTab, bills, subscriptions, searchTerm, rangeFilter, 
    shooterFilter, statusFilter, paymentMethodFilter, dateRange, amountRange
  ]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load Bills
      const billsRef = collection(db, 'bills');
      const billsQuery = query(billsRef, orderBy('createdAt', 'desc'));
      const billsSnapshot = await getDocs(billsQuery);
      
      const billsData = billsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        billDate: doc.data().billDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      }));
      
      // Load Subscriptions
      const subscriptionsRef = collection(db, 'subscriptions');
      const subscriptionsQuery = query(subscriptionsRef, orderBy('createdAt', 'desc'));
      const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
      
      const subscriptionsData = subscriptionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          extensions: data.extensions?.map(ext => ({
            ...ext,
            extendedAt: ext.extendedAt?.toDate() || new Date(),
            newEndDate: ext.newEndDate?.toDate() || new Date(),
            previousEndDate: ext.previousEndDate?.toDate() || new Date()
          })) || []
        };
      });
      
      setBills(billsData);
      setSubscriptions(subscriptionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    const currentData = activeTab === 'bills' ? bills : subscriptions;
    let filtered = [...currentData];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        (item.rangeName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.userName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (item.userEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (activeTab === 'bills' && (item.billId?.toLowerCase() || '').includes(searchTerm.toLowerCase())) ||
        (activeTab === 'bills' && (item.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
      );
    }

    // Range filter
    if (rangeFilter) {
      filtered = filtered.filter(item =>
        (item.rangeName?.toLowerCase() || '').includes(rangeFilter.toLowerCase())
      );
    }

    // Shooter filter
    if (shooterFilter) {
      filtered = filtered.filter(item =>
        (item.userName?.toLowerCase() || '').includes(shooterFilter.toLowerCase()) ||
        (item.userEmail?.toLowerCase() || '').includes(shooterFilter.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (activeTab === 'bills') {
        filtered = filtered.filter(item => item.billStatus === statusFilter);
      } else {
        filtered = filtered.filter(item => item.subscriptionStatus === statusFilter);
      }
    }

    // Payment method filter
    if (paymentMethodFilter !== 'all') {
      filtered = filtered.filter(item => item.paymentMethod === paymentMethodFilter);
    }

    // Date range filter
    if (dateRange.from && dateRange.to) {
      const fromDate = new Date(dateRange.from);
      const toDate = new Date(dateRange.to);
      filtered = filtered.filter(item => {
        const itemDate = activeTab === 'bills' ? 
          new Date(item.billDate || item.createdAt) : 
          new Date(item.createdAt);
        return itemDate >= fromDate && itemDate <= toDate;
      });
    }

    // Amount range filter
    if (amountRange.min || amountRange.max) {
      filtered = filtered.filter(item => {
        const amount = activeTab === 'bills' ? 
          (item.amountPaid || 0) : 
          (item.price || 0);
        const min = amountRange.min ? parseFloat(amountRange.min) : 0;
        const max = amountRange.max ? parseFloat(amountRange.max) : Infinity;
        return amount >= min && amount <= max;
      });
    }

    setFilteredData(filtered);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount, currency = 'INR') => {
    if (!amount) return '₹0.00';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusBadge = (status, type) => {
    if (!status) return null;
    
    const statusConfig = {
      // Bill statuses
      active: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
      inactive: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      // Subscription statuses
      expired: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
      // Payment statuses
      paid: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
      'paid ': { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
      pending: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: Clock },
      done: { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle },
      'done ': { color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: CheckCircle }
    };

    const config = statusConfig[status] || { color: 'bg-slate-100 text-slate-800 border-slate-200', icon: FileText };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1.5" />
        {status.trim().charAt(0).toUpperCase() + status.trim().slice(1)}
      </span>
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setRangeFilter('');
    setShooterFilter('');
    setStatusFilter('all');
    setPaymentMethodFilter('all');
    setDateRange({ from: '', to: '' });
    setAmountRange({ min: '', max: '' });
  };

  const exportData = () => {
    if (filteredData.length === 0) return;
    
    const dataToExport = filteredData.map(item => {
      if (activeTab === 'bills') {
        return {
          'Bill ID': item.billId || 'N/A',
          'Amount': item.amountPaid || 0,
          'Currency': item.currency || 'INR',
          'Range': item.rangeName || 'N/A',
          'User': item.userName || 'N/A',
          'Email': item.userEmail || 'N/A',
          'Payment Method': item.paymentMethod || 'N/A',
          'Status': item.billStatus || 'N/A',
          'Date': formatDate(item.billDate)
        };
      } else {
        return {
          'Range': item.rangeName || 'N/A',
          'User': item.userName || 'N/A',
          'Email': item.userEmail || 'N/A',
          'Plan': item.planDuration || 'N/A',
          'Price': item.price || 0,
          'Status': item.subscriptionStatus || 'N/A',
          'Start Date': formatDate(item.startDate),
          'End Date': formatDate(item.endDate)
        };
      }
    });

    const csv = [
      Object.keys(dataToExport[0]).join(','),
      ...dataToExport.map(row => Object.values(row).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Render Bills Item
  const renderBillItem = (item) => (
    <div className="space-y-4 lg:space-y-0 lg:flex lg:items-start lg:justify-between">
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            {item.billId || 'N/A'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(item.billStatus, 'bill')}
            {getStatusBadge(item.paymentStatus, 'payment')}
          </div>
        </div>
        
        {/* Amount */}
        <div className="flex items-center">
          <div className="bg-emerald-100 rounded-full p-2 mr-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
            {formatCurrency(item.amountPaid, item.currency)}
          </span>
        </div>
        
        {/* Description */}
        {item.description && <p className="text-slate-600 leading-relaxed">{item.description}</p>}
        
        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">User</p>
              <p className="font-semibold text-slate-900 truncate">{item.userName || 'N/A'}</p>
              <p className="text-xs text-slate-500 truncate">{item.userEmail || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Range</p>
              <p className="font-semibold text-slate-900">{item.rangeName || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-lg p-2">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Bill Date</p>
              <p className="font-semibold text-slate-900">{formatDate(item.billDate)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-amber-100 rounded-lg p-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Payment</p>
              <p className="font-semibold text-slate-900">{(item.paymentMethod || 'N/A').toUpperCase()}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex flex-row lg:flex-col gap-3 pt-4 lg:pt-0 lg:ml-6">
        <button className="flex-1 lg:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200">
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </button>
      </div>
    </div>
  );

  // Render Subscription Item
  const renderSubscriptionItem = (item) => (
    <div className="space-y-4 lg:space-y-0 lg:flex lg:items-start lg:justify-between">
      <div className="flex-1 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900">
            {item.planDuration || 'N/A'} Plan
          </h3>
          <div className="flex flex-wrap gap-2">
            {getStatusBadge(item.subscriptionStatus, 'subscription')}
          </div>
        </div>
        
        {/* Amount */}
        <div className="flex items-center">
          <div className="bg-emerald-100 rounded-full p-2 mr-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-2xl sm:text-3xl font-bold text-emerald-600">
            {formatCurrency(item.price, item.currency)}
          </span>
        </div>
        
        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">User</p>
              <p className="font-semibold text-slate-900 truncate">{item.userName || 'N/A'}</p>
              <p className="text-xs text-slate-500 truncate">{item.userEmail || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 rounded-lg p-2">
              <MapPin className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Range</p>
              <p className="font-semibold text-slate-900">{item.rangeName || 'N/A'}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 rounded-lg p-2">
              <Calendar className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Start Date</p>
              <p className="font-semibold text-slate-900">{formatDate(item.startDate)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 rounded-lg p-2">
              <Calendar className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">End Date</p>
              <p className="font-semibold text-slate-900">{formatDate(item.endDate)}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-amber-100 rounded-lg p-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Payment</p>
              <p className="font-semibold text-slate-900">{(item.paymentMethod || 'N/A').toUpperCase()}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-100 rounded-lg p-2">
              <Clock className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Extensions</p>
              <p className="font-semibold text-slate-900">{item.extensions ? item.extensions.length : 0}</p>
            </div>
          </div>
        </div>

        {/* Extensions */}
        {item.extensions && item.extensions.length > 0 && (
          <div className="mt-4 p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-slate-600" />
              Recent Extensions
            </h4>
            <div className="space-y-2">
              {item.extensions.slice(-2).map((extension, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-slate-900">{extension.planDuration || 'N/A'}</span>
                    <span className="text-sm font-bold text-green-600">{formatCurrency(extension.price)}</span>
                  </div>
                  <span className="text-xs text-slate-500">{formatDate(extension.extendedAt)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex flex-row lg:flex-col gap-3 pt-4 lg:pt-0 lg:ml-6">
        <button className="flex-1 lg:flex-none inline-flex items-center justify-center px-4 py-2.5 border border-slate-300 text-sm font-semibold rounded-xl text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 transition-all duration-200">
          <Eye className="w-4 h-4 mr-2" />
          View Details
        </button>
        {item.subscriptionStatus === 'active' && (
          <button className="flex-1 lg:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
            <Clock className="w-4 h-4 mr-2" />
            Extend
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 sm:px-8 py-6 sm:py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Financial Management</h1>
                <p className="text-slate-300 mt-1 text-sm sm:text-base">Manage your bills and subscriptions efficiently</p>
              </div>
              <button
                onClick={exportData}
                disabled={filteredData.length === 0}
                className="inline-flex items-center px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </button>
            </div>
          </div>

          <div className="p-4 sm:p-6 lg:p-8">
            {/* Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setActiveTab('bills')}
                  className={`flex items-center px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    activeTab === 'bills'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Bills</span>
                  <span className="sm:hidden">Bills</span>
                  <span className="ml-1 sm:ml-2 px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded-full">
                    {bills.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('subscriptions')}
                  className={`flex items-center px-4 sm:px-6 py-2.5 sm:py-3 text-sm font-semibold rounded-lg transition-all duration-200 ${
                    activeTab === 'subscriptions'
                      ? 'bg-white text-slate-900 shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Subscriptions</span>
                  <span className="sm:hidden">Subs</span>
                  <span className="ml-1 sm:ml-2 px-2 py-0.5 bg-slate-200 text-slate-700 text-xs rounded-full">
                    {subscriptions.length}
                  </span>
                </button>
              </div>

              <button
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="sm:hidden inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                {mobileFiltersOpen ? <X className="w-4 h-4 mr-2" /> : <Filter className="w-4 h-4 mr-2" />}
                Filters
              </button>
            </div>

            {/* Filters */}
            <div className={`space-y-4 sm:space-y-6 mb-6 sm:mb-8 ${mobileFiltersOpen ? 'block' : 'hidden sm:block'}`}>
              {/* Primary filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2.5 w-full border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Filter by range..."
                  value={rangeFilter}
                  onChange={(e) => setRangeFilter(e.target.value)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />

                <input
                  type="text"
                  placeholder="Filter by shooter..."
                  value={shooterFilter}
                  onChange={(e) => setShooterFilter(e.target.value)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                >
                  <option value="all">All Status</option>
                  {activeTab === 'bills' ? (
                    <>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </>
                  ) : (
                    <>
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                    </>
                  )}
                </select>
              </div>

              {/* Secondary filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                >
                  <option value="all">All Payment Methods</option>
                  <option value="cash">Cash</option>
                  <option value="upi">UPI</option>
                  <option value="card">Card</option>
                </select>

                <input
                  type="date"
                  placeholder="From date"
                  value={dateRange.from}
                  onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />

                <input
                  type="date"
                  placeholder="To date"
                  value={dateRange.to}
                  onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />

                <input
                  type="number"
                  placeholder="Min amount"
                  value={amountRange.min}
                  onChange={(e) => setAmountRange({ ...amountRange, min: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />

                <input
                  type="number"
                  placeholder="Max amount"
                  value={amountRange.max}
                  onChange={(e) => setAmountRange({ ...amountRange, max: e.target.value })}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                />
              </div>

              {/* Filter summary */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-slate-200">
                <div className="flex items-center text-sm text-slate-600">
                  <Filter className="w-4 h-4 mr-2 text-slate-400" />
                  <span className="font-medium">{filteredData.length}</span> of {activeTab === 'bills' ? bills.length : subscriptions.length} {activeTab}
                </div>
                
                <button
                  onClick={clearFilters}
                  className="text-sm text-blue-600 hover:text-blue-800 font-semibold transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            </div>

            {/* Data Display */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                  <p className="mt-4 text-slate-600 font-medium">Loading {activeTab}...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <div className="bg-slate-100 rounded-full p-6 mb-4">
                    <FileText className="w-12 h-12 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No {activeTab} found</h3>
                  <p className="text-sm">Try adjusting your filters or search terms</p>
                </div>
              ) : (
                filteredData.map((item) => (
                  <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 hover:shadow-lg hover:border-slate-300 transition-all duration-200">
                    {activeTab === 'bills' ? renderBillItem(item) : renderSubscriptionItem(item)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillsSubscriptionsComponent;
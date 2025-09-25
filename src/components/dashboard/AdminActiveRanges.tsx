import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db } from '@/firebase/config';
import { 
  Search, 
  MapPin, 
  Mail, 
  Phone, 
  DollarSign, 
  Clock, 
  Users, 
  Shield, 
  Trash2, 
  AlertTriangle,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Star,
  Calendar,
  Check,
  X,
  ShieldCheck,
  ShieldOff
} from 'lucide-react';
import { sendWelcomeEmail } from '@/lib/emailService'; // Adjust path as needed

const AdminActiveRanges = () => {
  const [ranges, setRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  
  // Pagination state for each tab
  const [currentPage, setCurrentPage] = useState({
    active: 1,
    blocked: 1,
    pending: 1
  });
  const [rangesPerPage] = useState(10);

  // Fetch all ranges
  useEffect(() => {
    fetchRanges();
  }, []);

  // Reset search and pagination when switching tabs
  useEffect(() => {
    setSearchTerm('');
  }, [activeTab]);

  const fetchRanges = async () => {
    try {
      setLoading(true);
      const rangesRef = collection(db, 'ranges');
      const q = query(rangesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const rangesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setRanges(rangesData);
    } catch (error) {
      console.error('Error fetching ranges:', error);
      alert('Error fetching ranges. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Send email notification
  const sendStatusEmail = async (range, status, action) => {
    try {
      const emailSubject = `Range ${status} - ${range.name}`;
      const emailText = `
        Dear ${range.ownerName},
        
        Your range "${range.name}" has been ${status} by the administrator.
        
        Action: ${action}
        Range: ${range.name}
        Address: ${range.address}
        Status: ${status}
        
        ${status === 'active' ? 'Your range is now active and visible to users.' : 
          status === 'blocked' ? 'Your range has been temporarily blocked. Please contact support for more information.' :
          'Your range has been removed from the platform.'}
        
        Thank you,
        Global Shooting League Team
      `;

      // Using the existing sendWelcomeEmail function
      const emailSent = await sendWelcomeEmail(range.ownerEmail, emailSubject);
      
      if (emailSent) {
        console.log(`Email sent successfully for range ${status}`);
      } else {
        console.warn(`Failed to send email for range ${status}`);
      }
    } catch (error) {
      console.error('Error sending status email:', error);
    }
  };

  // Filter ranges by tab and search
  const getFilteredRanges = (status) => {
    let filtered = ranges.filter(range => range.status === status);

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(range => 
        range.name?.toLowerCase().includes(term) ||
        range.ownerEmail?.toLowerCase().includes(term) ||
        range.ownerName?.toLowerCase().includes(term) ||
        range.address?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  // Get paginated ranges for current tab
  const getPaginatedRanges = (status) => {
    const filtered = getFilteredRanges(status);
    const startIndex = (currentPage[status] - 1) * rangesPerPage;
    const endIndex = startIndex + rangesPerPage;
    return filtered.slice(startIndex, endIndex);
  };

  const getTotalPages = (status) => {
    const filtered = getFilteredRanges(status);
    return Math.ceil(filtered.length / rangesPerPage);
  };

  const handlePageChange = (status, page) => {
    setCurrentPage(prev => ({
      ...prev,
      [status]: page
    }));
  };

  // Accept pending range (change status to active)
  const handleAcceptRange = async (rangeId) => {
    try {
      setActionLoading(prev => ({ ...prev, [rangeId]: true }));
      
      const rangeRef = doc(db, 'ranges', rangeId);
      const range = ranges.find(r => r.id === rangeId);
      
      await updateDoc(rangeRef, {
        status: 'active',
        updatedAt: new Date()
      });

      setRanges(prev => prev.map(range => 
        range.id === rangeId 
          ? { ...range, status: 'active' }
          : range
      ));

      // Send email notification
      await sendStatusEmail(range, 'activated', 'Range approved and activated');

      alert('Range accepted successfully! Email notification sent.');
    } catch (error) {
      console.error('Error accepting range:', error);
      alert('Error accepting range. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [rangeId]: false }));
    }
  };

  // Block active range
  const handleBlockRange = async (rangeId) => {
    try {
      setActionLoading(prev => ({ ...prev, [rangeId]: true }));
      
      const rangeRef = doc(db, 'ranges', rangeId);
      const range = ranges.find(r => r.id === rangeId);
      
      await updateDoc(rangeRef, {
        status: 'blocked',
        updatedAt: new Date()
      });

      setRanges(prev => prev.map(range => 
        range.id === rangeId 
          ? { ...range, status: 'blocked' }
          : range
      ));

      // Send email notification
      await sendStatusEmail(range, 'blocked', 'Range temporarily blocked');

      alert('Range blocked successfully! Email notification sent.');
    } catch (error) {
      console.error('Error blocking range:', error);
      alert('Error blocking range. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [rangeId]: false }));
    }
  };

  // Unblock blocked range
  const handleUnblockRange = async (rangeId) => {
    try {
      setActionLoading(prev => ({ ...prev, [rangeId]: true }));
      
      const rangeRef = doc(db, 'ranges', rangeId);
      const range = ranges.find(r => r.id === rangeId);
      
      await updateDoc(rangeRef, {
        status: 'active',
        updatedAt: new Date()
      });

      setRanges(prev => prev.map(range => 
        range.id === rangeId 
          ? { ...range, status: 'active' }
          : range
      ));

      // Send email notification
      await sendStatusEmail(range, 'activated', 'Range unblocked and reactivated');

      alert('Range unblocked successfully! Email notification sent.');
    } catch (error) {
      console.error('Error unblocking range:', error);
      alert('Error unblocking range. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [rangeId]: false }));
    }
  };

  // Delete range (used for reject and delete)
  const handleDeleteRange = async () => {
    if (!selectedRange) return;

    try {
      setActionLoading(prev => ({ ...prev, [selectedRange.id]: true }));
      
      // Send email notification before deletion
      await sendStatusEmail(selectedRange, 'deleted', 
        activeTab === 'pending' ? 'Range application rejected' : 'Range permanently deleted'
      );

      const rangeRef = doc(db, 'ranges', selectedRange.id);
      await deleteDoc(rangeRef);

      setRanges(prev => prev.filter(range => range.id !== selectedRange.id));
      
      setShowDeleteModal(false);
      setSelectedRange(null);
      alert('Range deleted successfully! Email notification sent.');
    } catch (error) {
      console.error('Error deleting range:', error);
      alert('Error deleting range. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedRange?.id]: false }));
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    let date;
    if (timestamp.toDate) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
      blocked: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }
    };

    const config = statusConfig[status] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        {status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'}
      </span>
    );
  };

  const renderActionButtons = (range) => {
    const isLoading = actionLoading[range.id];

    switch (activeTab) {
      case 'active':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleBlockRange(range.id)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <ShieldOff className="h-4 w-4" />
                  Block
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSelectedRange(range);
                setShowDeleteModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all text-sm font-medium border border-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        );

      case 'blocked':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleUnblockRange(range.id)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  Unblock
                </>
              )}
            </button>
          </div>
        );

      case 'pending':
        return (
          <div className="flex gap-2">
            <button
              onClick={() => handleAcceptRange(range.id)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Accept
                </>
              )}
            </button>
            <button
              onClick={() => {
                setSelectedRange(range);
                setShowDeleteModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all text-sm font-medium border border-red-200"
            >
              <X className="h-4 w-4" />
              Reject
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const renderPagination = () => {
    const totalPages = getTotalPages(activeTab);
    const currentTabPage = currentPage[activeTab];
    
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentTabPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    const filteredCount = getFilteredRanges(activeTab).length;
    const startIndex = (currentTabPage - 1) * rangesPerPage + 1;
    const endIndex = Math.min(currentTabPage * rangesPerPage, filteredCount);

    return (
      <div className="flex items-center justify-between mt-8 px-6 py-4 bg-white border-t">
        <div className="text-sm text-gray-700">
          Showing {startIndex} to {endIndex} of {filteredCount} results
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => handlePageChange(activeTab, Math.max(1, currentTabPage - 1))}
            disabled={currentTabPage === 1}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(activeTab, 1)}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50"
              >
                1
              </button>
              {startPage > 2 && <MoreHorizontal className="h-4 w-4 text-gray-400" />}
            </>
          )}

          {pageNumbers.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(activeTab, page)}
              className={`px-3 py-2 rounded-lg border ${
                currentTabPage === page
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              {page}
            </button>
          ))}

          {endPage < totalPages && (
            <>
              {endPage < totalPages - 1 && <MoreHorizontal className="h-4 w-4 text-gray-400" />}
              <button
                onClick={() => handlePageChange(activeTab, totalPages)}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => handlePageChange(activeTab, Math.min(totalPages, currentTabPage + 1))}
            disabled={currentTabPage === totalPages}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  const tabs = [
    { 
      key: 'active', 
      label: 'Active', 
      count: ranges.filter(r => r.status === 'active').length,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    { 
      key: 'blocked', 
      label: 'Blocked', 
      count: ranges.filter(r => r.status === 'blocked').length,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    },
    { 
      key: 'pending', 
      label: 'Pending', 
      count: ranges.filter(r => r.status === 'pending').length,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    }
  ];

  const currentRanges = getPaginatedRanges(activeTab);
  const currentFilteredCount = getFilteredRanges(activeTab).length;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Loading ranges...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white border-b px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Range Management</h1>
              <p className="text-gray-600 mt-1">Manage all shooting ranges in the system</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-600">{ranges.length}</div>
              <div className="text-sm text-gray-500">Total Ranges</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b">
          <div className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-all ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  {tab.label}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activeTab === tab.key 
                      ? `${tab.bgColor} ${tab.color}` 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Search Section */}
        <div className="p-6">
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by range name, owner email, owner name, or location..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                Showing {currentRanges.length} of {currentFilteredCount} {activeTab} ranges
                {searchTerm && ` (filtered)`}
              </div>
            </div>
          </div>

          {/* Ranges Grid */}
          {currentRanges.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="text-center py-16">
                <div className="text-gray-300 mb-4">
                  <MapPin className="h-20 w-20 mx-auto" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No {activeTab} ranges found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchTerm 
                    ? 'No ranges match your search criteria. Try adjusting your search terms.' 
                    : `No ${activeTab} ranges available at the moment.`}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {currentRanges.map((range) => (
                <div key={range.id} className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all duration-200">
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">{range.name}</h3>
                          {getStatusBadge(range.status)}
                          {range.ownerPremium && (
                            <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-purple-50 to-pink-50 text-purple-700 rounded-full text-xs font-medium border border-purple-200">
                              <Star className="h-3 w-3" />
                              Premium
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm">Range ID: {range.id}</p>
                      </div>
                      
                      {/* Action Buttons */}
                      {renderActionButtons(range)}
                    </div>

                    {/* Range Details Grid */}
                    <div className="grid lg:grid-cols-3 gap-6 mb-6">
                      {/* Owner Information */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Owner Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          {range.ownerName && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                              <span className="font-medium">Name:</span> {range.ownerName}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="h-3 w-3 text-gray-400" />
                            <span className="font-medium">Email:</span> {range.ownerEmail}
                          </div>
                          {range.contactNumber && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <Phone className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">Phone:</span> {range.contactNumber}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Location & Pricing */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Location & Pricing
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="text-gray-700">
                            <span className="font-medium">Address:</span>
                            <div className="mt-1 text-gray-600">{range.address}</div>
                          </div>
                          {range.pricePerHour && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <DollarSign className="h-3 w-3 text-gray-400" />
                              <span className="font-medium">Rate:</span> ${range.pricePerHour}/hour
                            </div>
                          )}
                          {(range.latitude && range.longitude) && (
                            <div className="text-xs text-gray-500">
                              Coordinates: {range.latitude}, {range.longitude}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Range Details */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Range Details
                        </h4>
                        <div className="space-y-2 text-sm">
                          {range.maxBookingsPerSlot && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                              <span className="font-medium">Capacity:</span> {range.maxBookingsPerSlot} bookings/slot
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="font-medium">Created:</span> {formatDate(range.createdAt)}
                          </div>
                          {range.updatedAt && (
                            <div className="text-xs text-gray-500">
                              Updated: {formatDate(range.updatedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    {range.description && (
                      <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                        <p className="text-sm text-gray-700 leading-relaxed">{range.description}</p>
                      </div>
                    )}

                    {/* Bottom Section: Facilities and Images */}
                    <div className="grid lg:grid-cols-2 gap-6">
                      {/* Facilities */}
                      {range.facilities && Array.isArray(range.facilities) && range.facilities.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Facilities ({range.facilities.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {range.facilities.map((facility, index) => (
                              <span 
                                key={index}
                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium border border-blue-200"
                              >
                                {facility}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Range Images */}
                      {range.rangeImages && Array.isArray(range.rangeImages) && range.rangeImages.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-900 mb-3">Images ({range.rangeImages.length})</h4>
                          <div className="flex gap-3 overflow-x-auto pb-2">
                            {range.rangeImages.slice(0, 4).map((image, index) => (
                              <img
                                key={index}
                                src={image}
                                alt={`Range ${index + 1}`}
                                className="h-20 w-28 object-cover rounded-lg border-2 border-white shadow-sm flex-shrink-0 hover:scale-105 transition-transform cursor-pointer"
                              />
                            ))}
                            {range.rangeImages.length > 4 && (
                              <div className="h-20 w-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg border-2 border-white shadow-sm flex items-center justify-center text-xs text-gray-600 font-medium">
                                +{range.rangeImages.length - 4} more
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {renderPagination()}
        </div>
      </div>

      {/* Delete/Reject Confirmation Modal */}
      {showDeleteModal && selectedRange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gray-50 rounded-lg border-l-4 border-red-400">
                <p className="font-medium text-gray-900">{selectedRange.name}</p>
                <p className="text-sm text-gray-600">{selectedRange.address}</p>
                <p className="text-sm text-gray-500">Owner: {selectedRange.ownerEmail}</p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedRange(null);
                }}
                className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRange}
                disabled={actionLoading[selectedRange.id]}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
              >
                {actionLoading[selectedRange.id] ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full"></div>
                    {activeTab === 'pending' ? 'Rejecting...' : 'Deleting...'}
                  </div>
                ) : (
                  activeTab === 'pending' ? 'Reject Range' : 'Delete Range'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminActiveRanges;
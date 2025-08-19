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
  Calendar
} from 'lucide-react';

const AdminActiveRanges = () => {
  const [ranges, setRanges] = useState([]);
  const [filteredRanges, setFilteredRanges] = useState([]);
  const [paginatedRanges, setPaginatedRanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedRange, setSelectedRange] = useState(null);
  const [actionLoading, setActionLoading] = useState({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rangesPerPage] = useState(10);

  // Fetch all ranges
  useEffect(() => {
    fetchRanges();
  }, []);

  // Filter ranges based on search term and status
  useEffect(() => {
    let filtered = ranges;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(range => range.status === statusFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(range => 
        range.name?.toLowerCase().includes(term) ||
        range.ownerEmail?.toLowerCase().includes(term) ||
        range.ownerName?.toLowerCase().includes(term) ||
        range.address?.toLowerCase().includes(term)
      );
    }

    setFilteredRanges(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [ranges, searchTerm, statusFilter]);

  // Paginate filtered ranges
  useEffect(() => {
    const startIndex = (currentPage - 1) * rangesPerPage;
    const endIndex = startIndex + rangesPerPage;
    setPaginatedRanges(filteredRanges.slice(startIndex, endIndex));
  }, [filteredRanges, currentPage, rangesPerPage]);

  const totalPages = Math.ceil(filteredRanges.length / rangesPerPage);

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

  const handleBlockRange = async (rangeId, currentStatus) => {
    try {
      setActionLoading(prev => ({ ...prev, [rangeId]: true }));
      
      const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
      const rangeRef = doc(db, 'ranges', rangeId);
      
      await updateDoc(rangeRef, {
        status: newStatus,
        updatedAt: new Date()
      });

      // Update local state
      setRanges(prev => prev.map(range => 
        range.id === rangeId 
          ? { ...range, status: newStatus }
          : range
      ));

      alert(`Range ${newStatus === 'blocked' ? 'blocked' : 'unblocked'} successfully!`);
    } catch (error) {
      console.error('Error updating range status:', error);
      alert('Error updating range status. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [rangeId]: false }));
    }
  };

  const handleDeleteRange = async () => {
    if (!selectedRange) return;

    try {
      setActionLoading(prev => ({ ...prev, [selectedRange.id]: true }));
      
      const rangeRef = doc(db, 'ranges', selectedRange.id);
      await deleteDoc(rangeRef);

      // Update local state
      setRanges(prev => prev.filter(range => range.id !== selectedRange.id));
      
      setShowDeleteModal(false);
      setSelectedRange(null);
      alert('Range deleted successfully!');
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

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="flex items-center justify-between mt-8 px-6 py-4 bg-white border-t">
        <div className="text-sm text-gray-700">
          Showing {((currentPage - 1) * rangesPerPage) + 1} to{' '}
          {Math.min(currentPage * rangesPerPage, filteredRanges.length)} of{' '}
          {filteredRanges.length} results
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {startPage > 1 && (
            <>
              <button
                onClick={() => setCurrentPage(1)}
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
              onClick={() => setCurrentPage(page)}
              className={`px-3 py-2 rounded-lg border ${
                currentPage === page
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
                onClick={() => setCurrentPage(totalPages)}
                className="px-3 py-2 rounded-lg border hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg border hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

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

        {/* Search and Filter Section */}
        <div className="p-6">
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Input */}
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

              {/* Status Filter */}
              <div className="relative min-w-[200px]">
                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-12 pr-8 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white transition-all"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
              <div className="text-sm text-gray-600">
                Showing {paginatedRanges.length} of {filteredRanges.length} ranges
                {searchTerm && ` (filtered from ${ranges.length} total)`}
              </div>
              <div className="flex gap-4 text-sm">
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  Active: {ranges.filter(r => r.status === 'active').length}
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  Blocked: {ranges.filter(r => r.status === 'blocked').length}
                </span>
              </div>
            </div>
          </div>

          {/* Ranges Grid */}
          {paginatedRanges.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="text-center py-16">
                <div className="text-gray-300 mb-4">
                  <MapPin className="h-20 w-20 mx-auto" />
                </div>
                <h3 className="text-xl font-medium text-gray-900 mb-2">No ranges found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  {searchTerm 
                    ? 'No ranges match your search criteria. Try adjusting your filters or search terms.' 
                    : 'No ranges match the current filters. Try changing the status filter.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {paginatedRanges.map((range) => (
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
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleBlockRange(range.id, range.status)}
                          disabled={actionLoading[range.id]}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            range.status === 'active'
                              ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {actionLoading[range.id] ? (
                            <div className="h-4 w-4 animate-spin border-2 border-current border-t-transparent rounded-full"></div>
                          ) : (
                            <>
                              <Shield className="h-4 w-4" />
                              {range.status === 'active' ? 'Block' : 'Unblock'}
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

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Delete Range</h3>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-3">
                Are you sure you want to delete this range? This action cannot be undone.
              </p>
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
                    Deleting...
                  </div>
                ) : (
                  'Delete Range'
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
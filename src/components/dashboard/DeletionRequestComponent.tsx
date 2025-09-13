import React, { useState, useEffect } from 'react';
import { Search, Trash2, Clock, User, Mail, FileText, CheckCircle, XCircle, Filter, AlertTriangle, RefreshCw } from 'lucide-react';
import { 
  collection, 
  getDocs, 
  doc, 
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../../firebase/config'; // Adjust path as needed

const DeletionRequestComponent = () => {
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    loadRequests();
  }, []);

  useEffect(() => {
    filterRequests();
  }, [requests, searchTerm, statusFilter, typeFilter]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const actionsRef = collection(db, 'actions');
      const q = query(
        actionsRef,
        where('type', 'in', ['delete_range_request', 'delete_event_request']),
      );
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      
      setRequests(data);
    } catch (error) {
      console.error('Error loading requests:', error);
      alert('Failed to load deletion requests');
    } finally {
      setLoading(false);
    }
  };

  const filterRequests = () => {
    let filtered = requests;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.rangeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.ownerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.message?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(request => request.type === typeFilter);
    }

    setFilteredRequests(filtered);
  };

  const handleDeleteRequest = async (request) => {
    if (!confirm(`Are you sure you want to delete this ${request.type === 'delete_range_request' ? 'range' : 'event'}? This action cannot be undone.`)) {
      return;
    }

    setProcessing({ ...processing, [request.id]: true });
    
    try {
      let deleteResult;
      
      if (request.type === 'delete_range_request') {
        // Delete the range document
        const rangeRef = doc(db, 'ranges', request.rangeId);
        await deleteDoc(rangeRef);
        
        // Also delete any related events in this range
        const eventsRef = collection(db, 'events');
        const eventsQuery = query(eventsRef, where('rangeId', '==', request.rangeId));
        const eventsSnapshot = await getDocs(eventsQuery);
        
        const deletePromises = eventsSnapshot.docs.map(eventDoc => 
          deleteDoc(doc(db, 'events', eventDoc.id))
        );
        await Promise.all(deletePromises);
        
        deleteResult = { success: true };
      } else if (request.type === 'delete_event_request') {
        const eventRef = doc(db, 'events', request.eventId);
        await deleteDoc(eventRef);
        deleteResult = { success: true };
      }

      if (deleteResult.success) {
        // Update request status to completed
        const requestRef = doc(db, 'actions', request.id);
        await updateDoc(requestRef, {
          completed: false, // As requested
          status: 'completed',
          updatedAt: new Date()
        });
        
        // Update local state
        setRequests(prev => prev.map(req => 
          req.id === request.id 
            ? { ...req, completed: false, status: 'completed' }
            : req
        ));

        alert(`${request.type === 'delete_range_request' ? 'Range' : 'Event'} deleted successfully!`);
      }
    } catch (error) {
      console.error('Error processing deletion:', error);
      alert(`Failed to delete ${request.type === 'delete_range_request' ? 'range' : 'event'}. Please try again.`);
    } finally {
      setProcessing({ ...processing, [request.id]: false });
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status, completed) => {
    if (completed === false && status === 'completed') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-100 to-green-50 text-green-800 border border-green-200">
          <CheckCircle className="w-3 h-3 mr-1.5" />
          Completed
        </span>
      );
    }
    
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-yellow-100 to-yellow-50 text-yellow-800 border border-yellow-200">
            <Clock className="w-3 h-3 mr-1.5" />
            Pending
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3 h-3 mr-1.5 animate-spin" />
            Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-50 text-gray-800 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  const getTypeBadge = (type) => {
    if (type === 'delete_range_request') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-red-100 to-red-50 text-red-800 border border-red-200">
          <AlertTriangle className="w-3 h-3 mr-1.5" />
          Range Deletion
        </span>
      );
    } else if (type === 'delete_event_request') {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-100 to-orange-50 text-orange-800 border border-orange-200">
          <FileText className="w-3 h-3 mr-1.5" />
          Event Deletion
        </span>
      );
    }
    return null;
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const completedCount = requests.filter(r => r.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm">
            <div className="px-6 py-8 sm:px-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Deletion Requests
                  </h1>
                  <p className="mt-2 text-gray-600">Manage and process deletion requests for ranges and events</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 px-4 py-2 rounded-lg border border-yellow-200">
                    <div className="text-sm font-medium text-yellow-800">Pending</div>
                    <div className="text-2xl font-bold text-yellow-900">{pendingCount}</div>
                  </div>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-2 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-800">Completed</div>
                    <div className="text-2xl font-bold text-green-900">{completedCount}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm mb-6">
          <div className="p-6 sm:p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 w-full border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
                />
              </div>
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
              </select>
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50/50 hover:bg-white focus:bg-white"
              >
                <option value="all">All Types</option>
                <option value="delete_range_request">Range Requests</option>
                <option value="delete_event_request">Event Requests</option>
              </select>
              
              <div className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                <Filter className="w-4 h-4 mr-2 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  {filteredRequests.length} of {requests.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 font-medium">Loading deletion requests...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No deletion requests found</h3>
              <p className="text-gray-500">Try adjusting your filters or check back later.</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-white rounded-2xl shadow-xl border border-white/20 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 overflow-hidden">
                <div className="p-6 sm:p-8">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between space-y-6 xl:space-y-0 xl:space-x-8">
                    <div className="flex-1 space-y-4">
                      {/* Header with badges */}
                      <div className="flex flex-wrap items-center gap-3">
                        {getTypeBadge(request.type)}
                        {getStatusBadge(request.status, request.completed)}
                      </div>
                      
                      {/* Title and message */}
                      <div className="space-y-3">
                        <h3 className="text-xl font-bold text-gray-900">
                          {request.type === 'delete_range_request' 
                            ? `Delete Range: ${request.rangeName}`
                            : `Delete Event: ${request.eventName}`
                          }
                        </h3>
                        
                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                          <p className="text-gray-700 font-medium">{request.message}</p>
                        </div>
                      </div>
                      
                      {/* Details grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-lg">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Owner ID</div>
                            <div className="text-sm font-medium text-gray-900 truncate">{request.ownerId}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-lg">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Mail className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</div>
                            <div className="text-sm font-medium text-gray-900 truncate">{request.ownerEmail}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-lg">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Clock className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created</div>
                            <div className="text-sm font-medium text-gray-900">{formatDate(request.createdAt)}</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 p-3 bg-gray-50/50 rounded-lg">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <FileText className="w-4 h-4 text-orange-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Target ID</div>
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {request.type === 'delete_range_request' 
                                ? request.rangeId
                                : request.eventId
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row xl:flex-col space-y-3 sm:space-y-0 sm:space-x-3 xl:space-x-0 xl:space-y-3">
                      {request.status === 'pending' && (
                        <button
                          onClick={() => handleDeleteRequest(request)}
                          disabled={processing[request.id]}
                          className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white text-sm font-semibold rounded-xl hover:from-red-700 hover:to-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
                        >
                          {processing[request.id] ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Process Deletion
                            </>
                          )}
                        </button>
                      )}
                      
                      {request.status === 'completed' && (
                        <div className="flex items-center justify-center px-6 py-3 bg-gradient-to-r from-green-100 to-green-50 text-green-800 text-sm font-semibold rounded-xl border border-green-200">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default DeletionRequestComponent;
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { Search, Filter, Download, Eye, Calendar, Target, User, MapPin, Star, FileText } from 'lucide-react';

// Initialize Firestore
const db = getFirestore();

// TypeScript interfaces
interface ShootingData {
  id: string;
  bookingId: string;
  createdAt: any;
  extractedPoints: number;
  fileName: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  finalPoints: number;
  notes?: string;
  rangeId: string;
  rangeName: string;
  shootingDate: string;
  updatedAt: any;
  uploadedBy: string;
  uploadedByName: string;
  userId: string;
  userName: string;
}

interface ShootingSession {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  pointsEarned: number;
  rangeName: string;
  rating: number;
  sessionName: string;
  sessionStats: {
    date: string;
    discipline: string;
    innerTens: number;
    totalScore: number;
  };
  shooterId: string;
  shooterName: string;
  uploadDate: any;
}

interface FilterOptions {
  dateRange: 'all' | 'today' | 'week' | 'month' | 'year';
  pointsRange: 'all' | 'low' | 'medium' | 'high';
  discipline: string;
  rangeName: string;
}

const CmbShooterData: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'shooter' | 'ranges'>('shooter');
  const [shootingData, setShootingData] = useState<ShootingData[]>([]);
  const [shootingSessions, setShootingSessions] = useState<ShootingSession[]>([]);
  const [filteredShootingData, setFilteredShootingData] = useState<ShootingData[]>([]);
  const [filteredShootingSessions, setFilteredShootingSessions] = useState<ShootingSession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filters, setFilters] = useState<FilterOptions>({
    dateRange: 'all',
    pointsRange: 'all',
    discipline: '',
    rangeName: ''
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Fetch shooting data from shootingData collection
  const fetchShootingData = async (): Promise<void> => {
    try {
      const shootingDataQuery = query(
        collection(db, 'shootingData'),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(shootingDataQuery);
      const data: ShootingData[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ShootingData));
      
      setShootingData(data);
      setFilteredShootingData(data);
    } catch (error) {
      console.error('Error fetching shooting data:', error);
      setError('Failed to load shooting data');
    }
  };

  // Fetch shooting sessions from ShootingSessions collection
  const fetchShootingSessions = async (): Promise<void> => {
    try {
      const shootingSessionsQuery = query(
        collection(db, 'shootingSessions'),
        orderBy('uploadDate', 'desc')
      );
      
      const snapshot = await getDocs(shootingSessionsQuery);
      const sessions: ShootingSession[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ShootingSession));
      
      setShootingSessions(sessions);
      setFilteredShootingSessions(sessions);
    } catch (error) {
      console.error('Error fetching shooting sessions:', error);
      setError('Failed to load shooting sessions');
    }
  };

  // Apply filters and search
  const applyFiltersAndSearch = (): void => {
    let filteredData = shootingData;
    let filteredSessions = shootingSessions;

    // Apply search term
    if (searchTerm) {
      filteredData = filteredData.filter(item =>
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rangeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      filteredSessions = filteredSessions.filter(item =>
        item.shooterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.rangeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sessionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sessionStats.discipline.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filteredData = filteredData.filter(item => {
        const itemDate = item.createdAt?.toDate() || new Date(0);
        return itemDate >= startDate;
      });

      filteredSessions = filteredSessions.filter(item => {
        const itemDate = item.uploadDate?.toDate() || new Date(0);
        return itemDate >= startDate;
      });
    }

    // Apply points range filter
    if (filters.pointsRange !== 'all') {
      const getPointsRange = (points: number): string => {
        if (points < 300) return 'low';
        if (points < 500) return 'medium';
        return 'high';
      };

      filteredData = filteredData.filter(item =>
        getPointsRange(item.finalPoints) === filters.pointsRange
      );

      filteredSessions = filteredSessions.filter(item =>
        getPointsRange(item.pointsEarned) === filters.pointsRange
      );
    }

    // Apply discipline filter
    if (filters.discipline) {
      filteredSessions = filteredSessions.filter(item =>
        item.sessionStats.discipline.toLowerCase().includes(filters.discipline.toLowerCase())
      );
    }

    // Apply range name filter
    if (filters.rangeName) {
      filteredData = filteredData.filter(item =>
        item.rangeName.toLowerCase().includes(filters.rangeName.toLowerCase())
      );

      filteredSessions = filteredSessions.filter(item =>
        item.rangeName.toLowerCase().includes(filters.rangeName.toLowerCase())
      );
    }

    setFilteredShootingData(filteredData);
    setFilteredShootingSessions(filteredSessions);
  };

  useEffect(() => {
    const loadData = async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        await Promise.all([
          fetchShootingData(),
          fetchShootingSessions()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [searchTerm, filters, shootingData, shootingSessions]);

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPointsColor = (points: number): string => {
    if (points < 300) return 'text-red-600 bg-red-100';
    if (points < 500) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getRatingStars = (rating: number): JSX.Element => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <div className="text-red-600 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-3xl font-bold text-gray-900">CMB Shooter Data</h1>
            <button 
              onClick={() => window.location.href = '/'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('shooter')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'shooter'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Shooter Data ({filteredShootingData.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('ranges')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ranges'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shooting Sessions ({filteredShootingSessions.length})
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by name, range, file, or notes..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="h-4 w-4" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                    <option value="year">This Year</option>
                  </select>
                </div>

                {/* Points Range Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Points Range</label>
                  <select
                    value={filters.pointsRange}
                    onChange={(e) => setFilters(prev => ({ ...prev, pointsRange: e.target.value as any }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">All Points</option>
                    <option value="low">Low (&lt; 300)</option>
                    <option value="medium">Medium (300-499)</option>
                    <option value="high">High (500+)</option>
                  </select>
                </div>

                {/* Discipline Filter (for sessions) */}
                {activeTab === 'ranges' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Discipline</label>
                    <input
                      type="text"
                      placeholder="Filter by discipline..."
                      value={filters.discipline}
                      onChange={(e) => setFilters(prev => ({ ...prev, discipline: e.target.value }))}
                      className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Range Name Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Range Name</label>
                  <input
                    type="text"
                    placeholder="Filter by range..."
                    value={filters.rangeName}
                    onChange={(e) => setFilters(prev => ({ ...prev, rangeName: e.target.value }))}
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-sm p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'shooter' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredShootingData.map(data => (
                  <div key={data.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5 text-blue-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {data.userName.split('|')[0] || 'Unknown'}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPointsColor(data.finalPoints)}`}>
                        {data.finalPoints} pts
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{data.rangeName}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="h-4 w-4" />
                        <span>{data.shootingDate}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <FileText className="h-4 w-4" />
                        <span>{data.fileName}</span>
                        <span className="text-xs text-gray-400">({formatFileSize(data.fileSize)})</span>
                      </div>

                      {data.notes && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Notes:</strong> {data.notes}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          {formatDate(data.createdAt)}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(data.fileUrl, '_blank')}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                          <button
                            onClick={() => window.open(data.fileUrl, '_blank')}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ranges' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredShootingSessions.map(session => (
                  <div key={session.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-900">
                          {session.sessionName}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPointsColor(session.pointsEarned)}`}>
                        {session.pointsEarned} pts
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>{session.shooterName}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{session.rangeName}</span>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500">Discipline:</span>
                            <div className="font-medium">{session.sessionStats.discipline}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Date:</span>
                            <div className="font-medium">{session.sessionStats.date}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Inner Tens:</span>
                            <div className="font-medium">{session.sessionStats.innerTens}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Total Score:</span>
                            <div className="font-medium">{session.sessionStats.totalScore}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">Rating:</span>
                          {getRatingStars(session.rating)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(session.uploadDate)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <span className="text-xs text-gray-500">
                          {session.fileName}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => window.open(session.fileUrl, '_blank')}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </button>
                          <button
                            onClick={() => window.open(session.fileUrl, '_blank')}
                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Data Message */}
            {((activeTab === 'shooter' && filteredShootingData.length === 0) ||
              (activeTab === 'ranges' && filteredShootingSessions.length === 0)) && (
              <div className="text-center py-12">
                <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
                <p className="text-gray-500">
                  {searchTerm || Object.values(filters).some(f => f !== 'all' && f !== '')
                    ? 'Try adjusting your search or filters'
                    : 'No shooting data available yet'}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CmbShooterData;
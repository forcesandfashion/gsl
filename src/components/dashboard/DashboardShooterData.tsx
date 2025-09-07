import React, { useState, useEffect } from 'react';
import { Download, Trash2, FileText, Target, Calendar, User, MapPin, Star, Trophy, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import{db} from "@/firebase/config";

import { getFirestore, collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';

// TypeScript interfaces
interface SessionStats {
  date: string;
  discipline: string;
  innerTens: number;
  totalScore: number;
}

interface ShooterData {
  id: string;
  type: 'shooter';
  fileName: string;
  fileType: string;
  fileUrl: string;
  pointsEarned: number;
  rating: number;
  sessionName: string;
  sessionStats: SessionStats;
  uploadDate: Date;
  shooterId?: string;
}

interface RangeData {
  id: string;
  type: 'range';
  bookingId: string;
  createdAt: Date;
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
  updatedAt: Date;
  uploadedBy: string;
  uploadedByName: string;
  userId: string;
  userName: string;
}

type DataItem = ShooterData | RangeData;

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const DashboardShooterData: React.FC = () => {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'range' | 'shooter'>('all');

  // Firebase configuration - Replace with your actual config
  const firebaseConfig: FirebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "global-shooting-league.firebaseapp.com",
    projectId: "global-shooting-league",
    storageBucket: "global-shooting-league.firebasestorage.app",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
  };


  const fetchFirebaseData = async (): Promise<void> => {
    try {
      setLoading(true);
      setError('');

  
      const rangeDataQuery = query(
        collection(db, 'shootingData'),
        orderBy('createdAt', 'desc')
      );
      const rangeSnapshot = await getDocs(rangeDataQuery);
      const rangeData: RangeData[] = rangeSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'range' as const,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as RangeData));
      

    
      const shooterData: ShooterData[] = [];
 
      const shootersSnapshot = await getDocs(collection(db, 'shooters'));
      
      for (const shooterDoc of shootersSnapshot.docs) {
        const sessionsSnapshot = await getDocs(
          collection(db, `shooters/${shooterDoc.id}/shootingSession`)
        );
        
        const shooterSessions = sessionsSnapshot.docs.map(sessionDoc => ({
          id: `${shooterDoc.id}_${sessionDoc.id}`,
          type: 'shooter' as const,
          shooterId: shooterDoc.id,
          ...sessionDoc.data(),
          uploadDate: sessionDoc.data().uploadDate?.toDate() || new Date(),
        } as ShooterData));
        
        shooterData.push(...shooterSessions);
      }
    
      // For demonstration, I'll use mock data that simulates Firebase structure
      const mockData: DataItem[] = [
        {
          id: 'range_1',
          type: 'range',
          bookingId: "xnALPFrsXuNbETFV65j5",
          createdAt: new Date("2025-08-27T01:49:37.000Z"),
          extractedPoints: 367,
          fileName: "2022-07-23T104344.csv",
          filePath: "shootingData/95Jtlg5pQfkRcJzkhbU9/uFYx4QQ2f7XA9Hvyd7rCCSeA1Jc2/1756259375637_2022-07-23T104344.csv",
          fileSize: 984,
          fileType: "csv",
          fileUrl: "https://firebasestorage.googleapis.com/v0/b/global-shooting-league.firebasestorage.app/o/shootingData%2F95Jtlg5pQfkRcJzkhbU9%2FuFYx4QQ2f7XA9Hvyd7rCCSeA1Jc2%2F1756259375637_2022-07-23T104344.csv?alt=media&token=1b7d2120-c5a7-4dc8-9c49-b2b0342a20d5",
          finalPoints: 367,
          notes: "best session for the user",
          rangeId: "95Jtlg5pQfkRcJzkhbU9",
          rangeName: "Test Range",
          shootingDate: "August 28th, 2025",
          updatedAt: new Date("2025-08-27T01:49:37.000Z"),
          uploadedBy: "rjlOYoFoLBeriPoUG1amWlaDe2L2",
          uploadedByName: "deepak singh rana|range_owner",
          userId: "uFYx4QQ2f7XA9Hvyd7rCCSeA1Jc2",
          userName: "naman|shooter"
        },
        {
          id: 'shooter_1',
          type: 'shooter',
          fileName: "2022-07-23T104344.csv",
          fileType: ".csv",
          fileUrl: "https://firebasestorage.googleapis.com/v0/b/global-shooting-league.firebasestorage.app/o/shooting-sessions%2FuFYx4QQ2f7XA9Hvyd7rCCSeA1Jc2%2F1756259454752_2022-07-23T104344.csv?alt=media&token=cb026b98-acc3-452f-94d2-99a159026cdc",
          pointsEarned: 367,
          rating: 4,
          sessionName: "morning session",
          sessionStats: {
            date: "23-07-2022",
            discipline: "Air Pistol 60",
            innerTens: 0,
            totalScore: 367
          },
          uploadDate: new Date("2025-08-27T01:50:56.000Z"),
          shooterId: "uFYx4QQ2f7XA9Hvyd7rCCSeA1Jc2"
        }
      ];

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setData(mockData);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data from Firebase. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Delete from Firebase
  const deleteFromFirebase = async (item: DataItem): Promise<void> => {
    try {
      if (item.type === 'range') {
        // Delete from shootingData collection
        await deleteDoc(doc(db, 'shootingData', item.id));
      } else {
        // Delete from shooters/{shooterId}/shootingSession subcollection
        const shooterId = item.shooterId;
        if (!shooterId) {
          throw new Error('Shooter ID not found');
        }
        // Extract the session document ID from the composite ID
        const sessionId = item.id.replace(`${shooterId}_`, '');
        await deleteDoc(doc(db, `shooters/${shooterId}/shootingSession`, sessionId));
      }
      
      // Remove from local state after successful deletion
      setData(prev => prev.filter(d => d.id !== item.id));
      
    } catch (err) {
      console.error('Error deleting document:', err);
      throw new Error('Failed to delete data from Firebase');
    }
  };

  useEffect(() => {
    fetchFirebaseData();
  }, []);

  const filteredData: DataItem[] = data.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const handleSelectItem = (id: string): void => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = (): void => {
    if (selectedItems.size === filteredData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredData.map(item => item.id)));
    }
  };

  const handleDownload = async (item: DataItem): Promise<void> => {
    try {
      const response = await fetch(item.fileUrl);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = item.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleDelete = async (item: DataItem): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this data? This action cannot be undone.')) {
      try {
        await deleteFromFirebase(item);
        setSelectedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(item.id);
          return newSet;
        });
      } catch (error) {
        alert('Failed to delete data. Please try again.');
      }
    }
  };

  const handleBulkDelete = async (): Promise<void> => {
    if (selectedItems.size === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedItems.size} selected items? This action cannot be undone.`)) {
      try {
        const itemsToDelete = data.filter(item => selectedItems.has(item.id));
        await Promise.all(itemsToDelete.map(item => deleteFromFirebase(item)));
        setSelectedItems(new Set());
      } catch (error) {
        alert('Failed to delete some items. Please try again.');
      }
    }
  };

  const handleBulkDownload = (): void => {
    selectedItems.forEach(id => {
      const item = data.find(d => d.id === id);
      if (item) {
        handleDownload(item);
      }
    });
  };

  const handleRetry = (): void => {
    fetchFirebaseData();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return Math.round(bytes / (1024 * 1024)) + ' MB';
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-300 rounded w-1/3"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
            <div className="h-64 bg-gray-300 rounded"></div>
          </div>
          <div className="flex justify-center items-center mt-8">
            <div className="text-gray-600">Loading data from Firebase...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-red-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={24} />
              <h2 className="text-xl font-semibold">Error Loading Data</h2>
            </div>
            <p className="text-gray-700 mb-4">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
              <button
                onClick={() => setError('')}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-blue-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Target className="text-blue-600" size={32} />
                Shooter Data Dashboard
              </h1>
              <p className="text-gray-600 mt-2">Manage shooting session data from ranges and shooters</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value as 'all' | 'range' | 'shooter')}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Data</option>
                <option value="range">Range Data</option>
                <option value="shooter">Shooter Data</option>
              </select>
              
              <button
                onClick={fetchFirebaseData}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Clock size={16} />
                Refresh
              </button>
              
              {selectedItems.size > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={handleBulkDownload}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Download size={16} />
                    Download Selected ({selectedItems.size})
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <Trash2 size={16} />
                    Delete Selected ({selectedItems.size})
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide">Total Records</p>
                <p className="text-2xl font-bold text-gray-800">{data.length}</p>
              </div>
              <FileText className="text-blue-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide">Range Data</p>
                <p className="text-2xl font-bold text-gray-800">{data.filter(d => d.type === 'range').length}</p>
              </div>
              <MapPin className="text-green-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide">Shooter Data</p>
                <p className="text-2xl font-bold text-gray-800">{data.filter(d => d.type === 'shooter').length}</p>
              </div>
              <User className="text-purple-500" size={24} />
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 uppercase tracking-wide">Selected</p>
                <p className="text-2xl font-bold text-gray-800">{selectedItems.size}</p>
              </div>
              <Trophy className="text-orange-500" size={24} />
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-lg border border-blue-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Data Records</h2>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedItems.size === filteredData.length && filteredData.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">Select All</span>
              </label>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            {filteredData.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <Target size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-lg">No data records found</p>
                <p className="text-sm">Try adjusting your filter settings or refresh the data</p>
              </div>
            ) : (
              <div className="space-y-4 p-6">
                {filteredData.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-6 transition-all duration-200 hover:shadow-md ${
                      selectedItems.has(item.id) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedItems.has(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          item.type === 'range' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {item.type === 'range' ? 'Range Data' : 'Shooter Data'}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleDownload(item)}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Download size={14} />
                          Download
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 text-sm"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* File Information */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          <FileText size={16} />
                          File Details
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{item.fileName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium">{item.fileType}</span>
                          </div>
                          {'fileSize' in item && item.fileSize && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Size:</span>
                              <span className="font-medium">{formatFileSize(item.fileSize)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Shooting Information */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          <Target size={16} />
                          Shooting Details
                        </h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Points:</span>
                            <span className="font-medium text-green-600">
                              {item.type === 'shooter' ? item.pointsEarned : 
                               item.type === 'range' ? (item.extractedPoints || item.finalPoints) : 0}
                            </span>
                          </div>
                          {item.type === 'shooter' && item.rating && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Rating:</span>
                              <div className="flex items-center gap-1">
                                <Star size={14} className="text-yellow-500 fill-current" />
                                <span className="font-medium">{item.rating}</span>
                              </div>
                            </div>
                          )}
                          {item.type === 'shooter' && item.sessionStats?.discipline && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Discipline:</span>
                              <span className="font-medium">{item.sessionStats.discipline}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Additional Information */}
                      <div className="space-y-3">
                        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                          <Clock size={16} />
                          Additional Info
                        </h3>
                        <div className="space-y-2 text-sm">
                          {item.type === 'shooter' && item.sessionName && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Session:</span>
                              <span className="font-medium">{item.sessionName}</span>
                            </div>
                          )}
                          {item.type === 'range' && item.rangeName && (
                            <div className="flex justify-between">
                              <span className="text-gray-600">Range:</span>
                              <span className="font-medium">{item.rangeName}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-gray-600">Date:</span>
                            <span className="font-medium">
                              {formatDate(item.type === 'shooter' ? item.uploadDate : item.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {item.type === 'range' && item.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Notes:</span> {item.notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardShooterData;
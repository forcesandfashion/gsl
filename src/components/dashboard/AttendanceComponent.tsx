import React, { useState, useEffect } from 'react';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  doc,
  getDocsFromServer
} from 'firebase/firestore';
import { 
  Search, 
  Filter, 
  UserCheck, 
  Calendar, 
  User, 
  MapPin, 
  Clock, 
  FileText, 
  ChevronDown, 
  ChevronUp,
  Download,
  Eye
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/firebase/config';

// TypeScript interfaces
interface Attendance {
  id: string;
  checkInTime: string;
  date: string;
  rangeId: string;
  rangeName: string;
  status: string;
  subscriptionId: string;
  timestamp: any;
  userEmail: string;
  userId: string;
  userName: string;
}

interface AttendanceFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: any;
  downloadURL?: string;
  uploadedBy: string;
}

const AttendanceComponent: React.FC = () => {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [filteredAttendance, setFilteredAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
  const [files, setFiles] = useState<{ [key: string]: AttendanceFile[] }>({});
  const [loadingFiles, setLoadingFiles] = useState<{ [key: string]: boolean }>({});

  const [filters, setFilters] = useState({
    search: '',
    dateRange: 'all',
    rangeName: 'all'
  });

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const attendanceRef = collection(db, 'attendance');
        const attendanceQuery = query(attendanceRef, orderBy('timestamp', 'desc'));
        const querySnapshot = await getDocs(attendanceQuery);
        
        const attendanceData: Attendance[] = [];
        querySnapshot.forEach((doc) => {
          attendanceData.push({
            id: doc.id,
            ...doc.data()
          } as Attendance);
        });
        
        setAttendance(attendanceData);
        setFilteredAttendance(attendanceData);
      } catch (error) {
        console.error('Error fetching attendance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, []);

  useEffect(() => {
    let result = attendance;
    
    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(record => 
        record.userName.toLowerCase().includes(searchTerm) ||
        record.userEmail.toLowerCase().includes(searchTerm) ||
        record.rangeName.toLowerCase().includes(searchTerm)
      );
    }
    
    // Apply date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      result = result.filter(record => {
        const recordDate = new Date(record.date);
        
        if (filters.dateRange === 'today') {
          return recordDate.toDateString() === now.toDateString();
        } else if (filters.dateRange === 'week') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return recordDate >= oneWeekAgo;
        } else if (filters.dateRange === 'month') {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return recordDate >= oneMonthAgo;
        }
        return true;
      });
    }
    
    // Apply range name filter
    if (filters.rangeName !== 'all') {
      result = result.filter(record => record.rangeName === filters.rangeName);
    }
    
    setFilteredAttendance(result);
  }, [attendance, filters]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
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
      return 'Invalid date';
    }
  };

  // Get unique range names for filter
  const rangeNames = Array.from(new Set(attendance.map(record => record.rangeName)));

  const toggleExpandRecord = async (recordId: string) => {
    if (expandedRecord === recordId) {
      setExpandedRecord(null);
    } else {
      setExpandedRecord(recordId);
      
      // Fetch files for this attendance record if not already loaded
      if (!files[recordId] && !loadingFiles[recordId]) {
        setLoadingFiles(prev => ({ ...prev, [recordId]: true }));
        await fetchAttendanceFiles(recordId);
      }
    }
  };

  const fetchAttendanceFiles = async (recordId: string) => {
    try {
      const attendanceRef = doc(db, "attendance", recordId);
      const filesRef = collection(attendanceRef, "files");
      const filesSnapshot = await getDocs(filesRef);
      
      const filesData: AttendanceFile[] = [];
      filesSnapshot.forEach((doc) => {
        filesData.push({
          id: doc.id,
          ...doc.data()
        } as AttendanceFile);
      });
      
      // Sort files by upload date (newest first)
      filesData.sort((a, b) => {
        const dateA = a.uploadedAt ? a.uploadedAt.toDate().getTime() : 0;
        const dateB = b.uploadedAt ? b.uploadedAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      
      setFiles(prev => ({ ...prev, [recordId]: filesData }));
    } catch (error) {
      console.error("Error fetching attendance files:", error);
    } finally {
      setLoadingFiles(prev => ({ ...prev, [recordId]: false }));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDownloadFile = (file: AttendanceFile) => {
    if (file.downloadURL) {
      window.open(file.downloadURL, '_blank');
    } else {
      // If no download URL, show a message
      alert(`File "${file.name}" doesn't have a download link. Please contact the range owner.`);
    }
  };

  const handleViewFile = (file: AttendanceFile) => {
    if (file.downloadURL) {
      window.open(file.downloadURL, '_blank');
    } else {
      alert(`File "${file.name}" doesn't have a viewable link. Please contact the range owner.`);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Attendance Management</h2>
          <p className="text-gray-600 mt-1">View and manage all attendance records</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-green-50 px-3 py-2 rounded-lg">
          <UserCheck className="h-4 w-4 text-green-600" />
          <span className="font-medium">{filteredAttendance.length} records found</span>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-r from-green-50 to-teal-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-green-800">
            <Filter className="h-5 w-5" />
            Filter Attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block text-green-700">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-green-500" />
                <Input
                  placeholder="Search attendance..."
                  className="pl-9 border-green-300 focus:border-green-500"
                  value={filters.search}
                  onChange={(e) => setFilters({...filters, search: e.target.value})}
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block text-green-700">Date Range</label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) => setFilters({...filters, dateRange: value})}
              >
                <SelectTrigger className="border-green-300 focus:border-green-500">
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
              <label className="text-sm font-medium mb-1 block text-green-700">Range Name</label>
              <Select
                value={filters.rangeName}
                onValueChange={(value) => setFilters({...filters, rangeName: value})}
              >
                <SelectTrigger className="border-green-300 focus:border-green-500">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ranges</SelectItem>
                  {rangeNames.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance List */}
      {filteredAttendance.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <UserCheck className="h-16 w-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No attendance records found</h3>
            <p className="text-gray-500 text-center max-w-md">
              {attendance.length === 0 ? 'No attendance records have been created yet.' : 'No records match your current filters.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAttendance.map((record) => (
            <Card key={record.id} className="overflow-hidden transition-all duration-200 hover:shadow-md">
              <CardHeader 
                className={`pb-4 cursor-pointer ${expandedRecord === record.id ? 'bg-green-50' : 'bg-gray-50'}`}
                onClick={() => toggleExpandRecord(record.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <UserCheck className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {record.userName}
                        {expandedRecord === record.id ? (
                          <ChevronUp className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-600">{record.userEmail}</p>
                    </div>
                  </div>
                  <Badge className={
                    record.status === "present" 
                      ? "bg-green-100 text-green-800 border-green-200" 
                      : "bg-red-100 text-red-800 border-red-200"
                  }>
                    {record.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              
              {expandedRecord === record.id && (
                <CardContent className="pt-4 animate-in fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">Date</p>
                      <p className="flex items-center gap-1 font-medium">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        {formatDate(record.date)}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">Check-in Time</p>
                      <p className="flex items-center gap-1 font-medium">
                        <Clock className="h-4 w-4 text-blue-500" />
                        {record.checkInTime}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">Range</p>
                      <p className="flex items-center gap-1 font-medium">
                        <MapPin className="h-4 w-4 text-red-500" />
                        {record.rangeName}
                      </p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm font-medium text-gray-500 mb-1">Subscription ID</p>
                      <p className="text-sm font-medium truncate">{record.subscriptionId || 'N/A'}</p>
                    </div>
                  </div>
                  
                  {/* Files Section */}
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-3">Uploaded Files</p>
                    
                    {loadingFiles[record.id] ? (
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                        <span className="ml-2 text-sm text-gray-500">Loading files...</span>
                      </div>
                    ) : files[record.id] && files[record.id].length > 0 ? (
                      <div className="space-y-3">
                        {files[record.id].map((file) => (
                          <div key={file.id} className="flex items-center justify-between bg-blue-50 p-3 rounded-md border border-blue-100">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{file.name}</p>
                                <div className="flex flex-wrap gap-2 mt-1">
                                  <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                                  <span className="text-xs text-gray-500">
                                    Uploaded: {formatDateTime(file.uploadedAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewFile(file)}
                                className="h-8 px-2"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDownloadFile(file)}
                                className="h-8 px-2 bg-green-600 hover:bg-green-700"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-md text-center">
                        <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">No files uploaded for this attendance record</p>
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

export default AttendanceComponent;
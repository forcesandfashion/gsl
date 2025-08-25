import React, { useState, useEffect } from 'react';
import { useAuth } from '@/firebase/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Download, 
  Search, 
  Calendar, 
  Star, 
  Target, 
  Filter,
  ArrowLeft,
  File,
  Eye,
  Trash2,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { db } from '@/firebase/config';
import { 
  collection, 
  query, 
  orderBy, 
  getDocs, 
  doc,
  deleteDoc,
  where
} from 'firebase/firestore';

interface ShootingSession {
  id: string;
  sessionName: string;
  rating: number;
  pointsEarned: number;
  fileName: string;
  fileType: string;
  fileUrl: string;
  uploadDate: any;
  sessionStats?: {
    totalScore: number;
    innerTens: number;
    discipline: string;
    date: string;
  };
}

const UserDocumentsPage = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ShootingSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<ShootingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRating, setFilterRating] = useState('all');
  const [filterFileType, setFilterFileType] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'points' | 'rating'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUserSessions();
  }, [user]);

  useEffect(() => {
    filterAndSortSessions();
  }, [sessions, searchTerm, filterRating, filterFileType, sortBy, sortOrder]);

  const fetchUserSessions = async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    try {
      const sessionsRef = collection(db, 'shooters', user.uid, 'shootingSessions');
      const sessionsQuery = query(sessionsRef, orderBy('uploadDate', 'desc'));
      const sessionsSnapshot = await getDocs(sessionsQuery);

      const sessionsData: ShootingSession[] = sessionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ShootingSession));

      setSessions(sessionsData);
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortSessions = () => {
    let filtered = sessions.filter(session => {
      const matchesSearch = session.sessionName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           session.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (session.sessionStats?.discipline || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRating = filterRating === 'all' || session.rating.toString() === filterRating;
      
      const matchesFileType = filterFileType === 'all' || session.fileType === filterFileType;

      return matchesSearch && matchesRating && matchesFileType;
    });

    // Sort sessions
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'points':
          aValue = a.pointsEarned;
          bValue = b.pointsEarned;
          break;
        case 'rating':
          aValue = a.rating;
          bValue = b.rating;
          break;
        case 'date':
        default:
          aValue = a.uploadDate?.toDate?.() || new Date(a.uploadDate);
          bValue = b.uploadDate?.toDate?.() || new Date(b.uploadDate);
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSessions(filtered);
  };

  const handleDownload = async (session: ShootingSession) => {
    if (!session.fileUrl) {
      alert('File URL not available');
      return;
    }

    try {
      const response = await fetch(session.fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = session.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (session: ShootingSession) => {
    if (!user?.uid) return;

    setDeleteLoading(session.id);
    try {
      await deleteDoc(doc(db, 'shooters', user.uid, 'shootingSessions', session.id));
      setSessions(prev => prev.filter(s => s.id !== session.id));
      alert('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Failed to delete session');
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleView = (session: ShootingSession) => {
    if (session.fileUrl) {
      window.open(session.fileUrl, '_blank');
    }
  };

  const handleBackToDashboard = () => {
    window.history.back();
  };

  const formatDate = (date: any) => {
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating 
                ? 'text-yellow-400 fill-current' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-gray-600 ml-1">({rating}/5)</span>
      </div>
    );
  };

  const getFileTypeIcon = (fileType: string) => {
    switch (fileType) {
      case '.pdf':
        return <File className="w-5 h-5 text-red-500" />;
      case '.csv':
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-blue-500" />;
    }
  };

  const totalPoints = sessions.reduce((sum, session) => sum + session.pointsEarned, 0);
  const averageRating = sessions.length > 0 
    ? (sessions.reduce((sum, session) => sum + session.rating, 0) / sessions.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading your documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white/90 shadow-lg backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBackToDashboard}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  My Documents
                </h1>
                <p className="text-slate-600 font-medium">View and manage your uploaded shooting session files</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-600 text-sm font-medium">Total Documents</p>
                  <p className="text-3xl font-bold text-blue-900">{sessions.length}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-600 text-sm font-medium">Total Points</p>
                  <p className="text-3xl font-bold text-green-900">{totalPoints}</p>
                </div>
                <Target className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-600 text-sm font-medium">Average Rating</p>
                  <p className="text-3xl font-bold text-yellow-900">{averageRating}/5</p>
                </div>
                <Star className="w-8 h-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Search & Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search sessions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              <select
                value={filterFileType}
                onChange={(e) => setFilterFileType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All File Types</option>
                <option value=".pdf">PDF Files</option>
                <option value=".csv">CSV Files</option>
              </select>

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'points' | 'rating')}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="date">Sort by Date</option>
                  <option value="points">Sort by Points</option>
                  <option value="rating">Sort by Rating</option>
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Uploaded Documents ({filteredSessions.length})</CardTitle>
            <CardDescription>
              All your shooting session documents with download options
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  {sessions.length === 0 ? 'No Documents Found' : 'No Matching Documents'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {sessions.length === 0 
                    ? 'You haven\'t uploaded any shooting session documents yet.'
                    : 'Try adjusting your search or filter criteria.'
                  }
                </p>
                {sessions.length === 0 && (
                  <Button onClick={handleBackToDashboard}>
                    Go to Dashboard to Upload
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          {getFileTypeIcon(session.fileType)}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{session.sessionName}</h3>
                            <p className="text-sm text-gray-600">{session.fileName}</p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              +{session.pointsEarned} points
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Rating:</span>
                            <div className="mt-1">{renderStars(session.rating)}</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Discipline:</span>
                            <p className="mt-1 text-gray-900">{session.sessionStats?.discipline || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Session Date:</span>
                            <p className="mt-1 text-gray-900">{session.sessionStats?.date || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Uploaded:</span>
                            <p className="mt-1 text-gray-900">{formatDate(session.uploadDate)}</p>
                          </div>
                        </div>

                        {session.sessionStats && (session.sessionStats.innerTens > 0 || session.sessionStats.totalScore > 0) && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {session.sessionStats.totalScore > 0 && (
                                <div>
                                  <span className="text-gray-500">Total Score:</span>
                                  <p className="font-medium text-gray-900">{session.sessionStats.totalScore}</p>
                                </div>
                              )}
                              {session.sessionStats.innerTens > 0 && (
                                <div>
                                  <span className="text-gray-500">Inner Tens:</span>
                                  <p className="font-medium text-gray-900">{session.sessionStats.innerTens}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(session)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(session)}
                          className="flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={deleteLoading === session.id}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Session</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{session.sessionName}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(session)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default UserDocumentsPage;
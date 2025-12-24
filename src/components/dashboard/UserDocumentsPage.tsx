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
                ? 'text-[#ff6b6b] fill-current' 
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
        return <File className="w-5 h-5 text-[#ff6b6b]" />;
      case '.csv':
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return <FileText className="w-5 h-5 text-[#1d4ed8]" />;
    }
  };

  const totalPoints = sessions.reduce((sum, session) => sum + session.pointsEarned, 0);
  const averageRating = sessions.length > 0 
    ? (sessions.reduce((sum, session) => sum + session.rating, 0) / sessions.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1d4ed8] mx-auto mb-4"></div>
          <p className="text-lg font-bold uppercase tracking-widest text-gray-500">Retrieving Documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header - White background with Blue tracking */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button
                onClick={handleBackToDashboard}
                variant="outline"
                size="sm"
                className="flex items-center gap-2 border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 font-black uppercase text-[10px] tracking-widest"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl md:text-4xl font-black text-[#0f172a] uppercase tracking-tighter flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  MY <span className="text-[#ff6b6b]">DOCUMENTS</span>
                </h1>
                <p className="text-gray-500 font-bold uppercase text-[10px] tracking-[0.2em]">Archival Session Storage</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
          <Card className="bg-white border-gray-100 shadow-xl border-t-4 border-[#1d4ed8]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#1d4ed8] text-xs font-black uppercase tracking-widest">Total Vault</p>
                  <p className="text-4xl font-black text-[#0f172a] mt-1">{sessions.length}</p>
                </div>
                <FileText className="w-10 h-10 text-gray-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-100 shadow-xl border-t-4 border-[#ff6b6b]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#ff6b6b] text-xs font-black uppercase tracking-widest">Career Points</p>
                  <p className="text-4xl font-black text-[#0f172a] mt-1">{totalPoints}</p>
                </div>
                <Target className="w-10 h-10 text-gray-100" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-100 shadow-xl border-t-4 border-[#1d4ed8]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[#1d4ed8] text-xs font-black uppercase tracking-widest">Performance Avg</p>
                  <p className="text-4xl font-black text-[#0f172a] mt-1">{averageRating}/5</p>
                </div>
                <Star className="w-10 h-10 text-gray-100" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-10 shadow-lg border-gray-100 bg-gray-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
              <Filter className="w-4 h-4" />
              Discovery Engine
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search file keywords..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-200 focus:border-[#1d4ed8]"
                />
              </div>

              <select
                value={filterRating}
                onChange={(e) => setFilterRating(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl bg-white font-bold text-sm outline-none focus:ring-2 focus:ring-[#1d4ed8]/20"
              >
                <option value="all">Any Rating</option>
                <option value="5">5 Star Elite</option>
                <option value="4">4 Star Pro</option>
                <option value="3">3 Star Basic</option>
              </select>

              <select
                value={filterFileType}
                onChange={(e) => setFilterFileType(e.target.value)}
                className="px-4 py-2 border border-gray-200 rounded-xl bg-white font-bold text-sm outline-none focus:ring-2 focus:ring-[#1d4ed8]/20"
              >
                <option value="all">All File Formats</option>
                <option value=".pdf">PDF Intelligence</option>
                <option value=".csv">CSV Scorecards</option>
              </select>

              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'date' | 'points' | 'rating')}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl bg-white font-bold text-sm outline-none focus:ring-2 focus:ring-[#1d4ed8]/20"
                >
                  <option value="date">Date Uploaded</option>
                  <option value="points">Points Earned</option>
                  <option value="rating">Rating Level</option>
                </select>
                <Button
                  variant="outline"
                  className="h-11 border-gray-200 rounded-xl hover:bg-[#1d4ed8] hover:text-white"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                >
                  {sortOrder === 'asc' ? <SortAsc className="w-5 h-5" /> : <SortDesc className="w-5 h-5" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Grid */}
        <Card className="shadow-2xl border-gray-100 rounded-3xl overflow-hidden">
          <CardHeader className="bg-white border-b border-gray-50 p-8">
            <CardTitle className="text-xl font-black text-[#0f172a] uppercase tracking-tight">Active Repositories ({filteredSessions.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredSessions.length === 0 ? (
              <div className="text-center py-24 bg-white">
                <FileText className="w-16 h-16 text-gray-100 mx-auto mb-4" />
                <h3 className="text-xl font-black text-gray-400 uppercase tracking-widest">No Documents Found</h3>
                <p className="text-gray-400 text-sm font-medium mt-2">Try adjusting your Discovery Engine filters</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filteredSessions.map((session) => (
                  <div key={session.id} className="p-8 hover:bg-blue-50/30 transition-all group">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 transition-transform group-hover:scale-110">
                            {getFileTypeIcon(session.fileType)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-lg text-[#0f172a] uppercase tracking-tight truncate group-hover:text-[#1d4ed8] transition-colors">
                              {session.sessionName}
                            </h3>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 mt-1">
                              {session.fileName}
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              {session.fileType.replace('.', '').toUpperCase()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-green-50 text-green-700 border border-green-100">
                              +{session.pointsEarned} PTS
                            </span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Session Assessment</span>
                            {renderStars(session.rating)}
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Discipline Class</span>
                            <p className="text-sm font-bold text-[#0f172a] uppercase tracking-tight">{session.sessionStats?.discipline || 'Standard'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Record Date</span>
                            <p className="text-sm font-bold text-[#0f172a] uppercase tracking-tight">{session.sessionStats?.date || 'N/A'}</p>
                          </div>
                          <div>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Vault Uploaded</span>
                            <p className="text-sm font-bold text-gray-500 uppercase tracking-tight">{formatDate(session.uploadDate)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl lg:bg-transparent lg:p-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleView(session)}
                          className="h-10 rounded-xl border-gray-200 font-black text-[10px] uppercase tracking-widest hover:border-[#1d4ed8] hover:text-[#1d4ed8]"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(session)}
                          className="h-10 rounded-xl border-gray-200 font-black text-[10px] uppercase tracking-widest hover:border-green-500 hover:text-green-500"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Sync
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-10 w-10 rounded-xl text-gray-300 hover:text-[#ff6b6b] hover:bg-red-50"
                              disabled={deleteLoading === session.id}
                            >
                              <Trash2 className="w-5 h-5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="rounded-3xl border-none p-8">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="font-black uppercase tracking-tighter text-[#0f172a] text-2xl">Delete from Vault?</AlertDialogTitle>
                              <AlertDialogDescription className="font-medium text-gray-500">
                                This action will permanently remove "{session.sessionName}" from your secure storage. Points may be affected.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="mt-8">
                              <AlertDialogCancel className="rounded-xl font-bold uppercase text-[10px] tracking-widest border-gray-100">Abort</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(session)}
                                className="rounded-xl bg-[#ff6b6b] hover:bg-red-700 font-black uppercase text-[10px] tracking-widest"
                              >
                                Confirm Delete
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
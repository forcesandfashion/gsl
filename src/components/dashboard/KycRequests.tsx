import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { db } from "@/firebase/config";
import { 
  collection, 
  getDocs, 
  query, 
  doc, 
  updateDoc, 
  orderBy,
  where,
  Timestamp,
  onSnapshot,
  Unsubscribe 
} from "firebase/firestore";
import { User } from "firebase/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  FileCheck, 
  CheckCircle, 
  XCircle, 
  Clock,
  AlertCircle,
  RefreshCw,
  ArrowLeft
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface KYCApplication {
  id: string;
  userId: string;
  name: string;
  email: string;
  phoneNumber: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  applicationDate: Timestamp | Date | null;
  reviewedBy?: string;
  reviewedAt?: Timestamp | Date | null;
}

interface ShooterData {
  id: string;
  wallet: boolean;
  kyc: boolean;
}

const KYCRequests: React.FC = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [kycApplications, setKycApplications] = useState<KYCApplication[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  // Role-based access control
  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const role = user.displayName?.split('|')[1] as string;
    if (role !== 'admin') {
      // Redirect non-admin users
      console.warn('Unauthorized access attempt to KYC requests');
      navigate("/");
      return;
    }
  }, [user, navigate]);

  // Fetch KYC applications
  useEffect((): (() => void) | void => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const kycQuery = query(
        collection(db, 'kyc-applications'),
        orderBy('applicationDate', 'desc')
      );

      const unsubscribe: Unsubscribe = onSnapshot(kycQuery, 
        (querySnapshot) => {
          const applications: KYCApplication[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            applications.push({
              id: doc.id,
              userId: data.userId,
              name: data.name,
              email: data.email,
              phoneNumber: data.phoneNumber,
              description: data.description,
              status: data.status,
              applicationDate: data.applicationDate,
              reviewedBy: data.reviewedBy,
              reviewedAt: data.reviewedAt
            } as KYCApplication);
          });
          setKycApplications(applications);
          setLoading(false);
        },
        (err: Error) => {
          console.error('Error fetching KYC applications:', err);
          setError('Failed to fetch KYC applications: ' + err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up KYC applications listener:', err);
      setError('Failed to set up real-time updates: ' + (err as Error).message);
      setLoading(false);
    }
  }, [user]);

  const handleSignOut = async (): Promise<void> => {
    await signOut();
    navigate("/");
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError("");
        setSuccess("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Approve KYC application
  const handleApprove = async (application: KYCApplication): Promise<void> => {
    if (!user) {
      setError("You must be logged in as an admin");
      return;
    }

    setProcessing(application.id);
    setError("");
    setSuccess("");

    try {
      // Update the KYC application status
      const applicationRef = doc(db, 'kyc-applications', application.id);
      await updateDoc(applicationRef, {
        status: 'approved',
        reviewedBy: user.uid,
        reviewedAt: new Date()
      });

      // Update the shooter's wallet and KYC status
      const shooterRef = doc(db, 'shooters', application.userId);
      await updateDoc(shooterRef, {
        wallet: true,
        kyc: true,
        updatedAt: new Date()
      });

      setSuccess(`KYC application for ${application.name} approved successfully!`);
    } catch (err) {
      console.error('Error approving KYC application:', err);
      setError((err as Error).message || 'Failed to approve KYC application');
    } finally {
      setProcessing(null);
    }
  };

  // Reject KYC application
  const handleReject = async (application: KYCApplication): Promise<void> => {
    if (!user) {
      setError("You must be logged in as an admin");
      return;
    }

    setProcessing(application.id);
    setError("");
    setSuccess("");

    try {
      // Update the KYC application status
      const applicationRef = doc(db, 'kyc-applications', application.id);
      await updateDoc(applicationRef, {
        status: 'rejected',
        reviewedBy: user.uid,
        reviewedAt: new Date()
      });

      setSuccess(`KYC application for ${application.name} rejected.`);
    } catch (err) {
      console.error('Error rejecting KYC application:', err);
      setError((err as Error).message || 'Failed to reject KYC application');
    } finally {
      setProcessing(null);
    }
  };

  // Get status color and icon
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return { color: 'text-yellow-600 bg-yellow-100', icon: <Clock size={16} /> };
      case 'approved':
        return { color: 'text-green-600 bg-green-100', icon: <CheckCircle size={16} /> };
      case 'rejected':
        return { color: 'text-red-600 bg-red-100', icon: <XCircle size={16} /> };
      default:
        return { color: 'text-gray-600 bg-gray-100', icon: <AlertCircle size={16} /> };
    }
  };

  // Format date
  const formatDate = (date: Timestamp | Date | null): string => {
    if (!date) return 'N/A';
    
    if (date instanceof Timestamp) {
      return date.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else if (date instanceof Date) {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return 'N/A';
  };

  // Get user role and name
  const getUserInfo = () => {
    if (!user?.displayName) return { name: user?.email || 'Admin', role: 'admin' };
    const [name, role] = user.displayName.split('|');
    return { name: name || user.email || 'Admin', role: role || 'admin' };
  };

  const { name: userName, role: userRole } = getUserInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/dashboard/admin")}
                className="flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  KYC Requests
                </h1>
                <p className="text-sm text-gray-500 mt-1">Manage user KYC verification requests</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border">
                <span className="font-medium">{userName}</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </span>
              </div>
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="text-sm hover:bg-red-50 hover:text-red-600 hover:border-red-300 transition-colors"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Success/Error Messages */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50 shadow-sm">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-6 border-green-200 bg-green-50 shadow-sm">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <Card className="bg-white/70 backdrop-blur-sm shadow-lg border-0 hover:shadow-xl transition-all duration-300">
          <CardHeader>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
                  <FileCheck className="h-6 w-6 text-cyan-600" />
                  KYC Verification Requests
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Review and manage user KYC applications ({kycApplications.length} total)
                  <span className="inline-flex items-center gap-1 text-green-600 ml-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Live updates
                  </span>
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800 font-medium">
                  {kycApplications.filter(app => app.status === 'pending').length} Pending
                </span>
                <span className="px-3 py-1 rounded-full text-xs bg-green-100 text-green-800 font-medium">
                  {kycApplications.filter(app => app.status === 'approved').length} Approved
                </span>
                <span className="px-3 py-1 rounded-full text-xs bg-red-100 text-red-800 font-medium">
                  {kycApplications.filter(app => app.status === 'rejected').length} Rejected
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                  <span className="text-gray-600">Loading KYC requests...</span>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">User Info</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Description</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Application Date</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-4 px-4 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kycApplications.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center gap-3">
                            <FileCheck className="h-12 w-12 text-gray-300" />
                            <p className="font-medium">No KYC applications found</p>
                            <p className="text-sm">All KYC requests have been processed.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      kycApplications.map((application) => {
                        const statusInfo = getStatusInfo(application.status);
                        return (
                          <tr key={application.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="font-medium text-gray-900">{application.name}</div>
                              <div className="text-gray-700 text-sm">{application.email}</div>
                              <div className="text-gray-600 text-xs">{application.phoneNumber}</div>
                              <div className="text-gray-500 text-xs mt-1">User ID: {application.userId}</div>
                            </td>
                            <td className="py-4 px-4 text-gray-700 max-w-md">
                              {application.description}
                            </td>
                            <td className="py-4 px-4 text-gray-600">
                              {formatDate(application.applicationDate)}
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                                {statusInfo.icon}
                                {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                              </span>
                              {application.reviewedBy && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Reviewed by: {application.reviewedBy}
                                </div>
                              )}
                              {application.reviewedAt && (
                                <div className="text-xs text-gray-500">
                                  On: {formatDate(application.reviewedAt)}
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4">
                              {application.status === 'pending' ? (
                                <div className="flex flex-col sm:flex-row gap-2">
                                  <Button
                                    onClick={() => handleApprove(application)}
                                    disabled={processing === application.id}
                                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3"
                                    size="sm"
                                  >
                                    {processing === application.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => handleReject(application)}
                                    disabled={processing === application.id}
                                    variant="outline"
                                    className="text-red-600 hover:text-red-800 hover:bg-red-50 border-red-300 text-xs h-8 px-3"
                                    size="sm"
                                  >
                                    {processing === application.id ? (
                                      <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                                    ) : (
                                      <XCircle className="h-3 w-3 mr-1" />
                                    )}
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-500">No actions available</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default KYCRequests;
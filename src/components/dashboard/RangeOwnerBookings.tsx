import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  Eye,
  Filter,
  Search,
  ArrowLeft,
  Ticket,
  TicketPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  MoreVertical,
  Edit,
  Target,
  Upload,
  FileText,
  Download,
  X,
  Info
} from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { db, storage } from "@/firebase/config";
import {
  getDocs,
  collection,
  query,
  where,
  orderBy,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { useAuth } from "@/firebase/auth";

interface Booking {
  id: string;
  bookingId: string;
  rangeId: string;
  userId: string;
  userName: string;
  rangeName: string;
  price: string;
  shootersCount: number;
  timeSlot: string;
  date: string;
  day: string;
  totalPrice: number;
  paymentMethod: string;
  paymentStatus: string;
  bookingStatus: string;
  visited: boolean;
  createdAt: any;
  updatedAt: any;
}

interface ShooterData {
  id?: string;
  bookingId: string;
  userId: string;
  userName: string;
  rangeId: string;
  rangeName: string;
  shootingDate: string;
  manualPoints?: number;
  fileUrl?: string;
  fileName?: string;
  fileType?: 'csv' | 'pdf';
  fileSize?: number;
  filePath?: string;
  extractedPoints?: number;
  finalPoints: number;
  notes?: string;
  remarks?: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: any;
  updatedAt: any;
}

export default function RangeOwnerBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
  const [filterVisited, setFilterVisited] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [shooterData, setShooterData] = useState<Partial<ShooterData>>({
    notes: '',
    remarks: '',
    finalPoints: 0
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // User search modal states
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userDocuments, setUserDocuments] = useState<ShooterData[]>([]);
  const [loadingUserSearch, setLoadingUserSearch] = useState(false);
  const [loadingUserDocs, setLoadingUserDocs] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Enhanced CSV points extraction
  const extractPointsFromCSV = async (file: File): Promise<{
    points: number | null;
    maxPoints?: number | null;
    success: boolean;
    message: string;
  }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csvContent = e.target?.result as string;
          const lines = csvContent.split('\n').map(line => line.trim());
          
          let extractedPoints: number | null = null;
          let totalPossiblePoints: number | null = null;
          
          // Look for the "Total:" line
          for (const line of lines) {
            if (line.toLowerCase().includes('total:')) {
              const parts = line.split(',');
              
              for (const part of parts) {
                const trimmed = part.trim();
                const scoreMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*(?:\((\d+(?:\.\d+)?)\))?$/);
                
                if (scoreMatch) {
                  extractedPoints = parseFloat(scoreMatch[1]);
                  if (scoreMatch[2]) {
                    totalPossiblePoints = parseFloat(scoreMatch[2]);
                  }
                  break;
                }
              }
              
              if (extractedPoints !== null) break;
            }
          }
          
          // Alternative parsing strategies
          if (extractedPoints === null) {
            for (const line of lines) {
              const cleanLine = line.trim().toLowerCase();
              
              if (cleanLine.includes('score:')) {
                const scoreMatch = line.match(/score:.*?(\d+(?:\.\d+)?)/i);
                if (scoreMatch) {
                  extractedPoints = parseFloat(scoreMatch[1]);
                  break;
                }
              }
              
              const parenthesesMatch = line.match(/\((\d{2,3}(?:\.\d+)?)\)/);
              if (parenthesesMatch && !extractedPoints) {
                const candidate = parseFloat(parenthesesMatch[1]);
                if (candidate >= 50 && candidate <= 1000) {
                  extractedPoints = candidate;
                }
              }
            }
          }
          
          if (extractedPoints !== null) {
            resolve({
              points: Math.round(extractedPoints),
              maxPoints: totalPossiblePoints ? Math.round(totalPossiblePoints) : null,
              success: true,
              message: `Extracted ${Math.round(extractedPoints)} points${totalPossiblePoints ? ` out of ${Math.round(totalPossiblePoints)}` : ''}`
            });
          } else {
            resolve({
              points: null,
              maxPoints: null,
              success: false,
              message: 'Could not find total score in CSV file.'
            });
          }
          
        } catch (error: any) {
          resolve({
            points: null,
            maxPoints: null,
            success: false,
            message: `Error parsing CSV: ${error.message}`
          });
        }
      };
      
      reader.onerror = () => {
        resolve({
          points: null,
          maxPoints: null,
          success: false,
          message: 'Error reading file'
        });
      };
      
      reader.readAsText(file);
    });
  };

  // Search users by name
  const searchUsersByName = async (searchTerm: string) => {
    if (!user || !searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoadingUserSearch(true);
      
      const rangesQuery = query(
        collection(db, "ranges"),
        where("ownerId", "==", user.uid)
      );
      const rangesSnapshot = await getDocs(rangesQuery);
      const rangeIds = rangesSnapshot.docs.map(doc => doc.id);

      if (rangeIds.length === 0) {
        setSearchResults([]);
        return;
      }

      const bookingsQuery = query(
        collection(db, "bookings"),
        where("rangeId", "in", rangeIds)
      );
      const bookingsSnapshot = await getDocs(bookingsQuery);

      const users = new Map();
      
      bookingsSnapshot.forEach((doc) => {
        const data = doc.data();
        const userName = data.userName?.toLowerCase() || '';
        const searchLower = searchTerm.toLowerCase();
        
        if (userName.includes(searchLower)) {
          const userId = data.userId;
          if (!users.has(userId)) {
            users.set(userId, {
              userId,
              userName: data.userName,
              email: data.userEmail || 'No email',
              totalBookings: 0,
              ranges: new Set()
            });
          }
          
          const userInfo = users.get(userId);
          userInfo.totalBookings += 1;
          userInfo.ranges.add(data.rangeName);
        }
      });

      const userResults = Array.from(users.values()).map(user => ({
        ...user,
        ranges: Array.from(user.ranges)
      }));

      setSearchResults(userResults);
      
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Search Error",
        description: "Failed to search users",
        variant: "destructive",
      });
    } finally {
      setLoadingUserSearch(false);
    }
  };

  // Get user's shooting documents
// Enhanced getUserDocuments function with better debugging and error handling

const getUserDocuments = async (userId: string, userName: string) => {
  if (!user) {
    console.error("No authenticated user");
    return;
  }

  try {
    setLoadingUserDocs(true);
    console.log(`Fetching documents for user: ${userName} (ID: ${userId})`);
    
    // Get all ranges owned by current user
    const rangesQuery = query(
      collection(db, "ranges"),
      where("ownerId", "==", user.uid)
    );
    const rangesSnapshot = await getDocs(rangesQuery);
    
    console.log(`Found ${rangesSnapshot.docs.length} ranges owned by current user`);
    
    if (rangesSnapshot.docs.length === 0) {
      console.log("No ranges found for current user");
      setUserDocuments([]);
      setSelectedUser({ userId, userName });
      return;
    }
    
    const allDocuments: ShooterData[] = [];
    
    // Try different query approaches
    console.log("Attempting to fetch shooting data documents...");
    
    // Method 1: Query all shootingData for this user first
    try {
      console.log("Method 1: Querying all shootingData by userId");
      const allUserDataQuery = query(
        collection(db, "shootingData"),
        where("userId", "==", userId)
      );
      
      const allUserDataSnapshot = await getDocs(allUserDataQuery);
      console.log(`Found ${allUserDataSnapshot.docs.length} total documents for user ${userId}`);
      
      // Filter by owned ranges
      const rangeIds = rangesSnapshot.docs.map(doc => doc.id);
      console.log("Owned range IDs:", rangeIds);
      
      allUserDataSnapshot.forEach((doc) => {
        const data = doc.data();
        console.log("Document data:", {
          id: doc.id,
          userId: data.userId,
          rangeId: data.rangeId,
          userName: data.userName,
          fileName: data.fileName,
          finalPoints: data.finalPoints
        });
        
        // Check if this document belongs to one of the owner's ranges
        if (rangeIds.includes(data.rangeId)) {
          console.log(`Document ${doc.id} belongs to owned range ${data.rangeId}`);
          allDocuments.push({
            id: doc.id,
            ...data
          } as ShooterData);
        } else {
          console.log(`Document ${doc.id} does not belong to owned ranges (rangeId: ${data.rangeId})`);
        }
      });
      
    } catch (error: any) {
      console.error("Method 1 failed:", error);
      
      // Method 2: Query by each range individually (fallback)
      console.log("Method 2: Querying by each range individually");
      for (const rangeDoc of rangesSnapshot.docs) {
        const rangeId = rangeDoc.id;
        console.log(`Querying range: ${rangeId}`);
        
        try {
          const shootingDataQuery = query(
            collection(db, "shootingData"),
            where("rangeId", "==", rangeId),
            where("userId", "==", userId)
          );
          
          const shootingDataSnapshot = await getDocs(shootingDataQuery);
          console.log(`Found ${shootingDataSnapshot.docs.length} documents in range ${rangeId}`);
          
          shootingDataSnapshot.forEach((doc) => {
            const data = doc.data();
            console.log("Range-specific document:", {
              id: doc.id,
              rangeId: data.rangeId,
              fileName: data.fileName,
              finalPoints: data.finalPoints
            });
            
            allDocuments.push({
              id: doc.id,
              ...data
            } as ShooterData);
          });
          
        } catch (rangeError: any) {
          console.error(`Error querying range ${rangeId}:`, rangeError);
          
          // Method 3: Simple query without compound where clauses
          try {
            console.log(`Method 3: Simple query for range ${rangeId}`);
            const simpleQuery = query(collection(db, "shootingData"));
            const simpleSnapshot = await getDocs(simpleQuery);
            
            simpleSnapshot.forEach((doc) => {
              const data = doc.data();
              // Manual filtering
              if (data.rangeId === rangeId && data.userId === userId) {
                console.log("Found matching document with simple query:", doc.id);
                allDocuments.push({
                  id: doc.id,
                  ...data
                } as ShooterData);
              }
            });
            
          } catch (simpleError: any) {
            console.error(`Simple query also failed for range ${rangeId}:`, simpleError);
          }
        }
      }
    }
    
    // Remove duplicates (if any)
    const uniqueDocuments = allDocuments.filter((doc, index, self) => 
      index === self.findIndex(d => d.id === doc.id)
    );
    
    console.log(`Total unique documents found: ${uniqueDocuments.length}`);
    
    // Sort by creation date
    uniqueDocuments.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      
      // Handle both Firestore Timestamp and Date objects
      const aTime = a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
      const bTime = b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
      
      return bTime - aTime;
    });
    
    setUserDocuments(uniqueDocuments);
    setSelectedUser({ userId, userName });
    
    if (uniqueDocuments.length === 0) {
      console.log("No documents found after all methods attempted");
      toast({
        title: "No Documents Found",
        description: `No shooting documents found for ${userName}. This could mean:\n- No files have been uploaded for this user\n- Documents are in a different collection\n- There might be a data structure mismatch`,
        variant: "default",
      });
    } else {
      console.log(`Successfully found ${uniqueDocuments.length} documents for ${userName}`);
    }
    
  } catch (error: any) {
    console.error("Error fetching user documents:", error);
    toast({
      title: "Error",
      description: `Failed to fetch user documents: ${error.message}`,
      variant: "destructive",
    });
  } finally {
    setLoadingUserDocs(false);
  }
};

// Additional debugging helper function
const debugShootingDataCollection = async () => {
  if (!user) return;
  
  console.log("=== DEBUGGING SHOOTING DATA COLLECTION ===");
  
  try {
    // Check if shootingData collection exists and has documents
    const allShootingDataQuery = query(collection(db, "shootingData"));
    const allShootingDataSnapshot = await getDocs(allShootingDataQuery);
    
    console.log(`Total documents in shootingData collection: ${allShootingDataSnapshot.docs.length}`);
    
    if (allShootingDataSnapshot.docs.length === 0) {
      console.log("❌ No documents found in shootingData collection");
      console.log("This suggests that either:");
      console.log("1. No shooter data has been uploaded yet");
      console.log("2. Documents are being saved to a different collection");
      console.log("3. There's an issue with the upload process");
    } else {
      console.log("✅ Documents found in shootingData collection");
      
      // Show sample documents
      allShootingDataSnapshot.docs.slice(0, 3).forEach((doc, index) => {
        const data = doc.data();
        console.log(`Sample document ${index + 1}:`, {
          id: doc.id,
          userId: data.userId,
          userName: data.userName,
          rangeId: data.rangeId,
          rangeName: data.rangeName,
          fileName: data.fileName,
          finalPoints: data.finalPoints,
          createdAt: data.createdAt
        });
      });
      
      // Check for current user's ranges
      const rangesQuery = query(
        collection(db, "ranges"),
        where("ownerId", "==", user.uid)
      );
      const rangesSnapshot = await getDocs(rangesQuery);
      const ownedRangeIds = rangesSnapshot.docs.map(doc => doc.id);
      
      console.log("Owned range IDs:", ownedRangeIds);
      
      // Check how many documents belong to owned ranges
      let ownedRangeDocuments = 0;
      allShootingDataSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (ownedRangeIds.includes(data.rangeId)) {
          ownedRangeDocuments++;
        }
      });
      
      console.log(`Documents belonging to your ranges: ${ownedRangeDocuments}`);
    }
    
  } catch (error: any) {
    console.error("Error debugging shootingData collection:", error);
  }
  
  console.log("=== END DEBUG ===");
};

// Call this function in useEffect or manually to debug
// debugShootingDataCollection();  // Fetch bookings
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const rangesQuery = query(
          collection(db, "ranges"),
          where("ownerId", "==", user.uid)
        );
        const rangesSnapshot = await getDocs(rangesQuery);
        const rangeIds = rangesSnapshot.docs.map(doc => doc.id);

        if (rangeIds.length === 0) {
          setBookings([]);
          setFilteredBookings([]);
          setLoading(false);
          return;
        }

        const bookingsQuery = query(
          collection(db, "bookings"),
          where("rangeId", "in", rangeIds)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);

        const bookingsData: Booking[] = [];

        bookingsSnapshot.forEach((doc) => {
          const data = doc.data();
          bookingsData.push({
            id: doc.id,
            bookingId: data.bookingId || doc.id,
            rangeId: data.rangeId || "",
            userId: data.userId || "",
            userName: data.userName || "Unknown User",
            rangeName: data.rangeName || "Unknown Range",
            price: data.price || "0",
            shootersCount: data.shootersCount || 1,
            timeSlot: data.timeSlot || "",
            date: data.date || "",
            day: data.day || "",
            totalPrice: data.totalPrice || 0,
            paymentMethod: data.paymentMethod || "",
            paymentStatus: data.paymentStatus || "pending",
            bookingStatus: data.bookingStatus || "confirmed",
            visited: data.visited || false,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });

        bookingsData.sort((a, b) => {
          if (!a.createdAt || !b.createdAt) return 0;
          return b.createdAt.toMillis() - a.createdAt.toMillis();
        });

        setBookings(bookingsData);
        setFilteredBookings(bookingsData);

      } catch (error: any) {
        console.error("Error fetching bookings:", error);
        setError(error.message || "Failed to fetch bookings");
        toast({
          title: "Error",
          description: `Failed to fetch bookings: ${error.message}`,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [user, toast]);

  // Apply filters
  useEffect(() => {
    let filtered = [...bookings];

    if (searchTerm) {
      filtered = filtered.filter(
        (booking) =>
          booking.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.rangeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    const parseBookingDate = (dateStr: string): Date | null => {
      try {
        const directParse = new Date(dateStr.trim());
        if (!isNaN(directParse.getTime())) {
          return directParse;
        }

        const monthMap: { [key: string]: number } = {
          'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
          'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5, 'july': 6, 'jul': 6,
          'august': 7, 'aug': 7, 'september': 8, 'sep': 8, 'sept': 8,
          'october': 9, 'oct': 9, 'november': 10, 'nov': 10, 'december': 11, 'dec': 11
        };

        const parts = dateStr.trim().split(' ');
        if (parts.length >= 3) {
          const monthName = parts[0].toLowerCase();
          const day = parseInt(parts[1].replace(',', ''));
          const year = parseInt(parts[2]);
          
          const monthIndex = monthMap[monthName];
          if (monthIndex !== undefined && !isNaN(day) && !isNaN(year)) {
            return new Date(year, monthIndex, day);
          }
        }

        return null;
      } catch (error) {
        return null;
      }
    };

    if (filterDate) {
      filtered = filtered.filter((booking) => {
        const bookingDate = parseBookingDate(booking.date);
        if (!bookingDate) return false;
        
        const filterDateObj = new Date(filterDate);
        
        return (
          bookingDate.getFullYear() === filterDateObj.getFullYear() &&
          bookingDate.getMonth() === filterDateObj.getMonth() &&
          bookingDate.getDate() === filterDateObj.getDate()
        );
      });
    }

    if (filterMonth) {
      filtered = filtered.filter((booking) => {
        const bookingDate = parseBookingDate(booking.date);
        if (!bookingDate) return false;
        
        const month = (bookingDate.getMonth() + 1).toString().padStart(2, "0");
        return month === filterMonth;
      });
    }

    if (filterPaymentStatus) {
      filtered = filtered.filter((booking) => booking.paymentStatus === filterPaymentStatus);
    }

    if (filterVisited) {
      const isVisited = filterVisited === "true";
      filtered = filtered.filter((booking) => booking.visited === isVisited);
    }

    setFilteredBookings(filtered);
  }, [bookings, searchTerm, filterDate, filterMonth, filterPaymentStatus, filterVisited]);

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    const fileSize = file.size;
    
    if (fileSize > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive",
      });
      return;
    }
    
    if (!fileType.includes('pdf') && !fileType.includes('csv') && 
        !fileName.endsWith('.pdf') && !fileName.endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please select only PDF or CSV files",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    
    const detectedType = fileName.endsWith('.csv') || fileType.includes('csv') ? 'csv' : 'pdf';
    setShooterData(prev => ({
      ...prev,
      fileName: file.name,
      fileType: detectedType,
      fileSize: fileSize
    }));

    if (detectedType === 'csv') {
      try {
        setUploading(true);
        
        const result = await extractPointsFromCSV(file);
        
        if (result.success && result.points !== null) {
          setShooterData(prev => ({
            ...prev,
            extractedPoints: result.points,
            finalPoints: result.points
          }));
          
          toast({
            title: "Points Extracted Successfully",
            description: result.message,
          });
        } else {
          toast({
            title: "Automatic Extraction Failed",
            description: result.message,
            variant: "destructive",
          });
        }
        
      } catch (error: any) {
        toast({
          title: "Extraction Error",
          description: error.message || "Failed to extract points from CSV",
          variant: "destructive",
        });
      } finally {
        setUploading(false);
      }
    }
  };

  // Open shooter data modal
  const openShooterDataModal = (booking: Booking) => {
    setSelectedBooking(booking);
    setShooterData({
      bookingId: booking.id,
      userId: booking.userId,
      userName: booking.userName,
      rangeId: booking.rangeId,
      rangeName: booking.rangeName,
      shootingDate: booking.date,
      notes: '',
      remarks: '',
      finalPoints: 0
    });
    setSelectedFile(null);
    setUploadProgress(0);
    setIsModalOpen(true);
  };

  // Submit shooter data
  const handleSubmitShooterData = async () => {
    if (!selectedBooking || !user || !selectedFile) {
      toast({
        title: "Missing Information",
        description: "Please select a file and fill in required fields",
        variant: "destructive",
      });
      return;
    }

    // Validate points for PDF files
    if (shooterData.fileType === 'pdf' && (!shooterData.finalPoints || shooterData.finalPoints <= 0)) {
      toast({
        title: "Missing Points",
        description: "Please enter valid points for PDF file",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);

      const timestamp = Date.now();
      const sanitizedFileName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const uniqueFileName = `${timestamp}_${sanitizedFileName}`;
      
      const storagePath = `shootingData/${selectedBooking.rangeId}/${selectedBooking.userId}/${uniqueFileName}`;
      const storageRef = ref(storage, storagePath);
      
      setUploadProgress(30);

      const uploadResult = await uploadBytes(storageRef, selectedFile);
      setUploadProgress(60);

      const downloadURL = await getDownloadURL(uploadResult.ref);
      setUploadProgress(80);

      // Clean and validate data before saving
      const finalPoints = shooterData.finalPoints || shooterData.extractedPoints || 0;
      const notes = (shooterData.notes || '').trim();
      const remarks = (shooterData.remarks || '').trim();

      const shooterDataToSave = {
        // Required fields
        bookingId: selectedBooking.id || '',
        userId: selectedBooking.userId || '',
        userName: selectedBooking.userName || '',
        rangeId: selectedBooking.rangeId || '',
        rangeName: selectedBooking.rangeName || '',
        shootingDate: selectedBooking.date || '',
        
        // File information
        fileUrl: downloadURL,
        fileName: selectedFile.name,
        fileType: shooterData.fileType || 'pdf',
        fileSize: selectedFile.size,
        filePath: storagePath,
        
        // Points and scoring
        finalPoints: Number(finalPoints),
        ...(shooterData.extractedPoints && { extractedPoints: Number(shooterData.extractedPoints) }),
        ...(shooterData.fileType === 'pdf' && shooterData.finalPoints && { 
          manualPoints: Number(shooterData.finalPoints) 
        }),
        
        // Optional fields - only include if not empty
        ...(notes && { notes }),
        ...(remarks && { remarks }),
        
        // Upload metadata
        uploadedBy: user.uid,
        uploadedByName: user.displayName || user.email || 'Range Owner',
        
        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      console.log('Saving shooter data:', shooterDataToSave);

      const docRef = await addDoc(collection(db, "shootingData"), shooterDataToSave);
      setUploadProgress(100);

      console.log('Document saved with ID:', docRef.id);

      toast({
        title: "Upload Successful",
        description: `Shooter data for ${selectedBooking.userName} has been saved successfully`,
      });

      setIsModalOpen(false);
      setSelectedBooking(null);
      setShooterData({ notes: '', remarks: '', finalPoints: 0 });
      setSelectedFile(null);
      setUploadProgress(0);

    } catch (error: any) {
      console.error("Error uploading shooter data:", error);
      
      // More specific error messages
      let errorMessage = "Failed to save shooter data";
      if (error.code === 'permission-denied') {
        errorMessage = "Permission denied. Please check your authentication.";
      } else if (error.code === 'invalid-argument') {
        errorMessage = "Invalid data provided. Please check all fields.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getBookingStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Confirmed</Badge>;
      case "cancelled":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const clearAllFilters = () => {
    setSearchTerm("");
    setFilterDate("");
    setFilterMonth("");
    setFilterPaymentStatus("");
    setFilterVisited("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-gray-600 text-lg mt-4">Loading bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Bookings</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <TicketPlus className="w-8 h-8 text-blue-600" />
                Bookings
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your bookings here ({filteredBookings.length} total)
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => setIsUserSearchOpen(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Search className="w-4 h-4 mr-2" />
                Search Users
              </Button>
              <Link to="/dashboard/range-owner">
                <Button variant="outline" className="hover:bg-gray-50">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search bookings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Input
                type="date"
                placeholder="Filter by date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
              />

              <Select value={filterMonth} onValueChange={(value) => setFilterMonth(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All months</SelectItem>
                  <SelectItem value="01">January</SelectItem>
                  <SelectItem value="02">February</SelectItem>
                  <SelectItem value="03">March</SelectItem>
                  <SelectItem value="04">April</SelectItem>
                  <SelectItem value="05">May</SelectItem>
                  <SelectItem value="06">June</SelectItem>
                  <SelectItem value="07">July</SelectItem>
                  <SelectItem value="08">August</SelectItem>
                  <SelectItem value="09">September</SelectItem>
                  <SelectItem value="10">October</SelectItem>
                  <SelectItem value="11">November</SelectItem>
                  <SelectItem value="12">December</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterPaymentStatus} onValueChange={(value) => setFilterPaymentStatus(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Payment status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All payments</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterVisited} onValueChange={(value) => setFilterVisited(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Visit status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All visits</SelectItem>
                  <SelectItem value="true">Visited</SelectItem>
                  <SelectItem value="false">Not visited</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={clearAllFilters} className="w-full">
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Ticket className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
              <p className="text-gray-500 text-center">
                {bookings.length === 0
                  ? "No bookings have been made yet."
                  : "No bookings match your current filters."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => (
              <Card
                key={booking.id}
                className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border-l-4 border-l-blue-500"
                onClick={() => navigate(`/dashboard/range-owner/bookings/${booking.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-5 h-5 text-blue-600" />
                      <CardTitle className="text-lg">{booking.bookingId}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      {booking.visited ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/range-owner/bookings/${booking.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/dashboard/bookings/${booking.id}/edit`);
                            }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Booking
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openShooterDataModal(booking);
                            }}
                          >
                            <Target className="w-4 h-4 mr-2" />
                            Add Shooter Data
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <User className="w-4 h-4" />
                    <span className="font-medium">{booking.userName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{booking.rangeName}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{booking.date}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{booking.timeSlot}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users className="w-4 h-4" />
                    <span>{booking.shootersCount} shooter(s)</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold">${booking.totalPrice.toFixed(2)}</span>
                    <span className="text-xs text-gray-500">({booking.paymentMethod})</span>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {getPaymentStatusBadge(booking.paymentStatus)}
                    {getBookingStatusBadge(booking.bookingStatus)}
                  </div>

                  <div className="pt-2 border-t flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/range-owner/bookings/${booking.id}`);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openShooterDataModal(booking);
                      }}
                    >
                      <Target className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Shooter Data Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Add Shooter Data & Upload Files
            </DialogTitle>
            <DialogDescription>
              Upload shooting data files and track points for {selectedBooking?.userName} at {selectedBooking?.rangeName}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Booking Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Customer:</span>
                  <span className="ml-2 font-medium">{selectedBooking?.userName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <span className="ml-2">{selectedBooking?.date}</span>
                </div>
                <div>
                  <span className="text-gray-500">Range:</span>
                  <span className="ml-2">{selectedBooking?.rangeName}</span>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>
                  <span className="ml-2">{selectedBooking?.timeSlot}</span>
                </div>
              </div>
            </div>

            {/* File Upload Section */}
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Upload Shooting Data File</Label>
                <p className="text-sm text-gray-500 mb-3">
                  Upload CSV or PDF files containing shooting results and scores
                </p>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>File Requirements:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                    <li>Only PDF and CSV files are accepted</li>
                    <li>CSV files: Points will be automatically extracted from the "Total:" row</li>
                    <li>PDF files: Points need to be manually entered after upload</li>
                    <li>Maximum file size: 10MB</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".csv,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="shooter-file-upload"
                  disabled={uploading}
                />
                <label htmlFor="shooter-file-upload" className={`cursor-pointer ${uploading ? 'pointer-events-none' : ''}`}>
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500">CSV or PDF files only (Max 10MB)</p>
                </label>
              </div>

              {uploading && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {selectedFile && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium text-blue-900">{selectedFile.name}</p>
                    <div className="flex items-center gap-4 text-sm text-blue-700 mt-1">
                      <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>{shooterData.fileType?.toUpperCase()}</span>
                      <span>•</span>
                      <span>{new Date().toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setShooterData(prev => ({
                        ...prev,
                        fileName: undefined,
                        fileType: undefined,
                        fileSize: undefined,
                        extractedPoints: undefined,
                        finalPoints: 0
                      }));
                    }}
                    disabled={uploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {shooterData.extractedPoints && shooterData.fileType === 'csv' && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">Points Auto-Extracted from CSV</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-green-700">
                      Automatically detected <strong>{shooterData.extractedPoints}</strong> points from the uploaded CSV file.
                    </p>
                    <div className="text-2xl font-bold text-green-600">
                      {shooterData.extractedPoints}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Points Entry Section */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Shooting Points</Label>
              
              {shooterData.fileType === 'csv' ? (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-blue-900">Final Points:</span>
                      <p className="text-sm text-blue-600 mt-1">
                        Points automatically extracted from CSV file
                      </p>
                    </div>
                    <span className="text-3xl font-bold text-blue-700">
                      {shooterData.finalPoints || 0}
                    </span>
                  </div>
                </div>
              ) : shooterData.fileType === 'pdf' ? (
                <div className="space-y-3">
                  <Label htmlFor="pdf-points" className="text-sm font-medium">
                    Enter Points for PDF File *
                  </Label>
                  <Input
                    id="pdf-points"
                    type="number"
                    placeholder="Enter shooting points (0-1000)"
                    value={shooterData.finalPoints || ''}
                    onChange={(e) => setShooterData(prev => ({
                      ...prev,
                      finalPoints: parseInt(e.target.value) || 0
                    }))}
                    min="0"
                    max="1000"
                    className="text-lg font-semibold"
                  />
                  <p className="text-sm text-gray-500">
                    Please manually enter the shooting points from the PDF document
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-gray-100 rounded-lg text-center text-gray-500">
                  Please upload a file first to enter points
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="notes" className="text-base font-medium">
                Session Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add notes about the shooting session..."
                value={shooterData.notes || ''}
                onChange={(e) => setShooterData(prev => ({
                  ...prev,
                  notes: e.target.value
                }))}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="remarks" className="text-base font-medium">
                Additional Remarks
              </Label>
              <Textarea
                id="remarks"
                placeholder="Any additional remarks or observations..."
                value={shooterData.remarks || ''}
                onChange={(e) => setShooterData(prev => ({
                  ...prev,
                  remarks: e.target.value
                }))}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex gap-3 pt-6">
            <Button
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setSelectedBooking(null);
                setShooterData({});
                setSelectedFile(null);
                setUploadProgress(0);
              }}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitShooterData}
              disabled={uploading || !selectedFile || (shooterData.fileType === 'pdf' && !shooterData.finalPoints)}
              className="min-w-[140px]"
            >
              {uploading ? (
                <>
                  <LoadingSpinner className="w-4 h-4 mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload & Save
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Search Modal */}
      <Dialog open={isUserSearchOpen} onOpenChange={setIsUserSearchOpen}>
        <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-green-600" />
              Search Users & View Shooting Documents
            </DialogTitle>
            <DialogDescription>
              Search for users who have booked your ranges and view their uploaded shooting documents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="user-search" className="text-base font-medium">
                Search by User Name
              </Label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  id="user-search"
                  placeholder="Type user name to search..."
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    searchUsersByName(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {userSearchTerm && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Search Results</h4>
                
                {loadingUserSearch ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                    <span className="ml-2">Searching users...</span>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No users found matching "{userSearchTerm}"
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                    {searchResults.map((user) => (
                      <Card
                        key={user.userId}
                        className="cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => getUserDocuments(user.userId, user.userName)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <h5 className="font-medium text-gray-900">{user.userName}</h5>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Ticket className="w-3 h-3" />
                                  {user.totalBookings} bookings
                                </span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {user.ranges.length} range(s)
                                </span>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {selectedUser && (
              <div className="space-y-4 border-t pt-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">
                    Documents for {selectedUser.userName}
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedUser(null);
                      setUserDocuments([]);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {loadingUserDocs ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner />
                    <span className="ml-2">Loading documents...</span>
                  </div>
                ) : userDocuments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p>No shooting documents found for this user</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {userDocuments.length}
                          </div>
                          <div className="text-sm text-gray-600">Total Sessions</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {userDocuments.reduce((sum, doc) => sum + (doc.finalPoints || 0), 0)}
                          </div>
                          <div className="text-sm text-gray-600">Total Points</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {userDocuments.length > 0 
                              ? Math.round(userDocuments.reduce((sum, doc) => sum + (doc.finalPoints || 0), 0) / userDocuments.length)
                              : 0
                            }
                          </div>
                          <div className="text-sm text-gray-600">Average Score</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {Math.max(...userDocuments.map(doc => doc.finalPoints || 0), 0)}
                          </div>
                          <div className="text-sm text-gray-600">Best Score</div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {userDocuments.map((doc) => (
                        <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                  <FileText className="w-5 h-5 text-blue-600" />
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                      {doc.fileName || 'Shooting Document'}
                                    </span>
                                    <Badge variant="outline" className="text-xs">
                                      {doc.fileType?.toUpperCase() || 'FILE'}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                  <div>
                                    <span className="text-gray-500">Range:</span>
                                    <div className="font-medium">{doc.rangeName}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Date:</span>
                                    <div className="font-medium">{doc.shootingDate}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Points:</span>
                                    <div className="font-medium text-green-600 text-lg">{doc.finalPoints}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Uploaded:</span>
                                    <div className="font-medium">
                                      {doc.createdAt?.toDate ? 
                                        new Date(doc.createdAt.toDate()).toLocaleDateString() : 
                                        'Unknown'
                                      }
                                    </div>
                                  </div>
                                </div>

                                {(doc.notes || doc.remarks) && (
                                  <div className="space-y-2">
                                    {doc.notes && (
                                      <div className="p-2 bg-blue-50 rounded text-sm">
                                        <span className="font-medium text-blue-900">Notes: </span>
                                        <span className="text-blue-800">{doc.notes}</span>
                                      </div>
                                    )}
                                    {doc.remarks && (
                                      <div className="p-2 bg-purple-50 rounded text-sm">
                                        <span className="font-medium text-purple-900">Remarks: </span>
                                        <span className="text-purple-800">{doc.remarks}</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 ml-4">
                                {doc.fileUrl && (
                                  <Button size="sm" variant="outline" asChild>
                                    <a 
                                      href={doc.fileUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-1"
                                    >
                                      <Download className="w-4 h-4" />
                                      Download
                                    </a>
                                  </Button>
                                )}
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-green-600">
                                    {doc.finalPoints}
                                  </div>
                                  <div className="text-xs text-gray-500">points</div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsUserSearchOpen(false);
                setUserSearchTerm("");
                setSearchResults([]);
                setSelectedUser(null);
                setUserDocuments([]);
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
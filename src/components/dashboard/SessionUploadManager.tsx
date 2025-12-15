import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// Assuming you have Select components for dropdowns
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, FileText, AlertCircle, CheckCircle, Star, Eye, File, MapPin, Users } from "lucide-react";
import { db, storage } from "@/firebase/config";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  addDoc, 
  increment,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// --- MOCK/INTERFACE DATA FOR DEMONSTRATION ---
interface Student {
    uid: string;
    name: string;
}

const mockStudents: Student[] = [
    { uid: "S101_Aarav", name: "Aarav Gupta" },
    { uid: "S102_Priya", name: "Priya Singh" },
    { uid: "S103_Vikram", name: "Vikram Reddy" },
];

// --- UNIVERSAL COMPONENT ---
const SessionUploadManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Role State (Determine role based on fetched data, not just guessing)
  const [userRole, setUserRole] = useState<'shooter' | 'coach' | 'loading' | null>('loading');
  
  // Coach States
  const [targetStudentId, setTargetStudentId] = useState<string | null>(null);
  const [coachStudents, setCoachStudents] = useState<Student[]>([]);
  
  // Existing States
  const [sessionName, setSessionName] = useState("");
  const [rangeName, setRangeName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rating, setRating] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

  const isCoach = userRole === 'coach';

  // --- 1. ROLE AND STUDENT FETCH EFFECT ---
  useEffect(() => {
    const checkRoleAndFetchStudents = async () => {
      if (!user?.uid) {
        setUserRole(null);
        return;
      }
      
      let role: 'shooter' | 'coach' | null = null;
      let students: Student[] = [];

      try {
        // Check for coach profile first
        const coachDocRef = doc(db, "technical-coaches", user.uid);
        const coachDoc = await getDoc(coachDocRef);

        if (coachDoc.exists()) {
          role = 'coach';
          // Fetch assigned students (Mocked here, replace with real query)
          // const studentsQuery = query(collection(db, "shooters"), where("coachId", "==", user.uid));
          // const studentsSnapshot = await getDocs(studentsQuery);
          // students = studentsSnapshot.docs.map(doc => ({ uid: doc.id, name: doc.data().name }));
          students = mockStudents; // Using mock for demo
        } else {
          // If not a coach, check for shooter profile
          const shooterDocRef = doc(db, "shooters", user.uid);
          const shooterDoc = await getDoc(shooterDocRef);
          if (shooterDoc.exists()) {
            role = 'shooter';
          }
        }
      } catch (e) {
        console.error("Error fetching user role:", e);
      }

      setUserRole(role);
      setCoachStudents(students);
      if (role === 'coach' && students.length > 0) {
        setTargetStudentId(students[0].uid);
      } else if (role === 'shooter') {
          // For shooters, the target ID is always their own UID
          setTargetStudentId(user.uid);
      }
    };

    checkRoleAndFetchStudents();
  }, [user?.uid]);
  
  // ... (parseCSV and parsePDF functions remain the same) ...
  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    let totalPoints = 0;
    let sessionData = { totalScore: 0, innerTens: 0, seriesScores: [], date: '', discipline: '' };
    for (const line of lines) {
        const cells = line.split(',');
        if (cells[0] && cells[0].trim() === 'Total:') {
            const totalText = cells[1] || '';
            const match = totalText.match(/(\d+)/);
            if (match) {
                totalPoints = parseInt(match[1]);
                sessionData.totalScore = totalPoints;
            }
        }
    }
    return { totalPoints, sessionData, rawData: csvText };
  };

  const parsePDF = async (file: File) => {
    // Keeping simplified PDF logic for demonstration
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            try {
                const arrayBuffer = fileReader.result as ArrayBuffer;
                const uint8Array = new Uint8Array(arrayBuffer);
                let text = new TextDecoder('ascii').decode(uint8Array).replace(/[^a-zA-Z0-9\s:\/\-\(\)\.]/g, ' '); 

                let totalPoints = 0;
                let sessionData = { totalScore: 0, innerTens: 0, seriesScores: [], date: '', discipline: '' };

                const totalMatches = text.match(/(?:Total|Score)[\s:]+(\d+)/gi);
                if (totalMatches) {
                    const match = totalMatches[totalMatches.length - 1].match(/(\d+)/);
                    if (match) {
                        totalPoints = parseInt(match[1]);
                        sessionData.totalScore = totalPoints;
                    }
                }
                
                resolve({ totalPoints, sessionData, rawData: text.substring(0, 1000) });

            } catch (error) {
                reject(error);
            }
        };
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
  };
  // ... (End of parsing functions) ...


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    setFile(selectedFile);
    setError(null);
    setSuccess(false);
  };

  const handleStarClick = (starValue: number) => {
    setRating(starValue);
  };

  const handleViewDocuments = () => {
    navigate(`/dashboard/${userRole}/documents`); // Dynamic navigation
  };


  const handleUpload = async () => {
    // Determine the actual ID the session belongs to
    const shooterId = targetStudentId; 
    
    if (!file || !sessionName || !rangeName || !user || rating === 0 || !shooterId) {
      setError("Please complete all fields (Session Name, Range, Rating, File). Coaches must select a student.");
      return;
    }

    const allowedTypes = ['.csv', '.pdf'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      setError("Please upload a CSV or PDF file only.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(false);

      // --- 2. Parsing ---
      let parsedResult;
      if (fileExtension === '.csv') {
        const fileContent = await file.text();
        parsedResult = parseCSV(fileContent);
      } else if (fileExtension === '.pdf') {
        parsedResult = await parsePDF(file);
      }

      const { totalPoints, sessionData: parsedSessionData } = parsedResult as any;

      if (totalPoints === 0) {
        setError(`Could not extract valid points. Please check the ${fileExtension.toUpperCase()} file format.`);
        return;
      }

      // --- 3. Get Target Shooter Profile Info and UPDATE Score ---
      const shooterDocRef = doc(db, "shooters", shooterId);
      const shooterDoc = await getDoc(shooterDocRef);
      
      // CHECK: If the target document doesn't exist, we must stop the upload.
      if (!shooterDoc.exists()) {
          // This addresses the "No document to update" error from before.
          setError(`Target Shooter Profile (ID: ${shooterId}) not found in the 'shooters' collection.`);
          setUploading(false); // Stop here
          return; 
      }

      const shooterData = shooterDoc.data();
      const targetShooterName = shooterData?.name || 'Unknown Shooter';
      const shooterCoachId = shooterData?.coachId || 'N/A'; // Get the shooter's assigned coach ID

      // Update shooter's total points (only if the profile exists, which we just confirmed)
      await updateDoc(shooterDocRef, {
        totalPoints: increment(totalPoints)
      });


      // --- 4. File Upload to Storage ---
      const fileName = `${shooterId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `shooting-sessions/${fileName}`);
      await uploadBytes(storageRef, file);
      const fileDownloadURL = await getDownloadURL(storageRef);

      // --- 5. Prepare and Save Session Data ---
      const sessionDocData: any = {
        sessionName,
        rangeName,
        rating,
        fileName: file.name,
        fileType: fileExtension,
        pointsEarned: totalPoints,
        uploadDate: new Date(),
        fileUrl: fileDownloadURL,
        // Target Shooter Info
        shooterId: shooterId, 
        shooterName: targetShooterName,
        shooterCoachId: shooterCoachId,
        // Uploader Info
        uploadedBy: isCoach ? 'Coach' : 'Shooter',
        uploaderId: user.uid,
        sessionStats: {
          totalScore: parsedSessionData.totalScore,
          innerTens: parsedSessionData.innerTens,
          discipline: parsedSessionData.discipline,
          date: parsedSessionData.date
        }
      };

      // 1. Save to main shootingSessions collection
      const mainSessionsCollectionRef = collection(db, "shootingSessions");
      const mainSessionDocRef = await addDoc(mainSessionsCollectionRef, sessionDocData);

      // 2. Save to shooters/{id}/shootingSessions subcollection (Using the target shooter ID)
      const userSessionsCollectionRef = collection(db, "shooters", shooterId, "shootingSessions");
      await addDoc(userSessionsCollectionRef, {
        ...sessionDocData,
        mainSessionId: mainSessionDocRef.id // Reference to the main collection document
      });

      setParsedData({ totalPoints, sessionData: parsedSessionData, fileType: fileExtension });
      setSuccess(true);
      setSessionName("");
      setRangeName("");
      setFile(null);
      setRating(0);
      
      const fileInput = document.getElementById("session-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      toast({
        title: "Session Saved Successfully",
        description: `Session for ${targetShooterName} saved with ${totalPoints} points added!`,
      });

    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || `Failed to upload session data from ${file.name.split('.').pop()?.toUpperCase()} file.`);
    } finally {
      setUploading(false);
    }
  };
  
    if (userRole === 'loading') {
        return <p className="text-center text-indigo-600">Checking user profile...</p>;
    }
    
    if (!userRole) {
        return <p className="text-center text-red-600">Access denied. User role not defined or profile missing.</p>;
    }

  return (
    <div className="space-y-4">
      <Card className="w-full bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {isCoach ? 'Coach: Upload Student Session' : 'Upload Your Session'}
          </CardTitle>
          <CardDescription>
            Upload shooting session data from CSV or PDF files to update the shooter's score and analytics.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">

                {/* --- COACH: TARGET STUDENT SELECTION --- */}
                {isCoach && (
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                        <label className="text-sm font-bold text-indigo-700 block mb-1 flex items-center gap-1">
                            <Users className="h-4 w-4" /> Target Student
                        </label>
                        <Select onValueChange={setTargetStudentId} defaultValue={targetStudentId || ""}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a Student" />
                            </SelectTrigger>
                            <SelectContent>
                                {coachStudents.length === 0 ? (
                                    <SelectItem disabled value="none">No Students Assigned</SelectItem>
                                ) : (
                                    coachStudents.map(student => (
                                        <SelectItem key={student.uid} value={student.uid}>
                                            {student.name}
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                        {!targetStudentId && <p className="text-xs text-red-500 mt-1">Please select a student to upload for.</p>}
                    </div>
                )}
                {/* --- END COACH SELECT --- */}

            <div>
              <label
                htmlFor="session-name"
                className="text-sm font-medium block mb-1"
              >
                Session Name
              </label>
              <Input
                id="session-name"
                placeholder="e.g., Morning Session with 12mm"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
              />
            </div>

            <div>
              <label
                htmlFor="range-name"
                className="text-sm font-medium  mb-1 flex items-center gap-1"
              >
                <MapPin className="h-4 w-4" />
                Range Name
              </label>
              <Input
                id="range-name"
                placeholder="e.g., City Shooting Range, Olympic Training Center"
                value={rangeName}
                onChange={(e) => setRangeName(e.target.value)}
              />
            </div>

            {/* Enhanced Star Rating Section (1-5 stars) */}
            <div>
              <label className="text-sm font-medium block mb-2">
                Session Rating
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleStarClick(star)}
                    className={`p-1 rounded transition-colors ${
                      rating >= star
                        ? "text-yellow-400 hover:text-yellow-500"
                        : "text-gray-300 hover:text-yellow-300"
                    }`}
                  >
                    <Star 
                      className={`h-6 w-6 ${rating >= star ? "fill-current" : ""}`} 
                    />
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Rate your session from 1 to 5 stars
              </p>
            </div>

            <div>
              <label
                htmlFor="session-file"
                className="text-sm font-medium block mb-1"
              >
                Session File (CSV or PDF)
              </label>
              <div className="flex items-center gap-2">
                <Input
                  id="session-file"
                  type="file"
                  accept=".csv,.pdf"
                  onChange={handleFileChange}
                  className="flex-1"
                />
                <Button
                  onClick={handleUpload}
                  disabled={!file || !sessionName || !rangeName || rating === 0 || uploading || (isCoach && !targetStudentId)}
                  className="whitespace-nowrap"
                >
                  {uploading ? (
                    "Uploading..."
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Supported formats: CSV, PDF (max 10MB each)
              </p>
            </div>

            {file && (
              <div className="flex items-center text-sm text-blue-600 bg-blue-50 p-2 rounded">
                <File className="mr-2 h-4 w-4" />
                <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
            )}

            {error && (
              <div className="flex items-center text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                <AlertCircle className="mr-2 h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="mr-2 h-4 w-4" />
                <span>Session uploaded successfully!</span>
              </div>
            )}

            {parsedData && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Session Summary:</h4>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>File Type:</strong> {parsedData.fileType.toUpperCase()}</p>
                  <p><strong>Points Added:</strong> {parsedData.totalPoints}</p>
                  <p><strong>Rating:</strong> {rating}/5 stars</p>
                  <p><strong>Range:</strong> {rangeName}</p>
                  {parsedData.sessionData.discipline && (
                    <p><strong>Discipline:</strong> {parsedData.sessionData.discipline}</p>
                  )}
                  {parsedData.sessionData.date && (
                    <p><strong>Date:</strong> {parsedData.sessionData.date}</p>
                  )}
                  {parsedData.sessionData.innerTens > 0 && (
                    <p><strong>Inner Tens:</strong> {parsedData.sessionData.innerTens}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* View Documents Button */}
      <Card className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-blue-900">View Uploaded Documents</h3>
                <p className="text-sm text-blue-700">Browse and manage your uploaded session files</p>
              </div>
            </div>
            <Button
              onClick={handleViewDocuments}
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <FileText className="mr-2 h-4 w-4" />
              View Documents
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SessionUploadManager;
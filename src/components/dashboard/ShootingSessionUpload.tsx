import React, { useState } from "react";
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
import { Upload, FileText, AlertCircle, CheckCircle, Star, Eye, File, MapPin } from "lucide-react";
import { db, storage } from "@/firebase/config";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  collection, 
  addDoc, 
  increment 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const ShootingSessionUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [sessionName, setSessionName] = useState("");
  const [rangeName, setRangeName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [rating, setRating] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

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
    navigate("/dashboard/documents");
  };

  // Enhanced CSV parsing function to extract total points
  const parseCSV = (csvText: string) => {
    const lines = csvText.split('\n');
    let totalPoints = 0;
    let sessionData = {
      totalScore: 0,
      innerTens: 0,
      seriesScores: [],
      date: '',
      discipline: ''
    };

    // Look for the total score line
    for (const line of lines) {
      const cells = line.split(',');
      
      // Look for "Total:" in the first cell
      if (cells[0] && cells[0].trim() === 'Total:') {
        const totalText = cells[1] || '';
        // Extract number before parentheses (e.g., "555 (583.2)" -> 555)
        const match = totalText.match(/(\d+)/);
        if (match) {
          totalPoints = parseInt(match[1]);
          sessionData.totalScore = totalPoints;
        }
      }
      
      // Look for Inner tens
      if (cells[0] && cells[0].trim() === '' && cells[3] && cells[3].trim() === 'Inner tens:') {
        const innerTensText = cells[5] || '';
        const innerTensMatch = innerTensText.match(/(\d+)/);
        if (innerTensMatch) {
          sessionData.innerTens = parseInt(innerTensMatch[1]);
        }
      }
      
      // Look for discipline (e.g., "Air Pistol 60")
      if (cells[0] && (cells[0].includes('Pistol') || cells[0].includes('Rifle'))) {
        sessionData.discipline = cells[0].trim();
      }
      
      // Look for date in the header
      if (line.includes('2022') || line.includes('2023') || line.includes('2024') || line.includes('2025')) {
        const dateMatch = line.match(/(\d{2}-\d{2}-\d{4})/);
        if (dateMatch) {
          sessionData.date = dateMatch[1];
        }
      }
    }

    return {
      totalPoints,
      sessionData,
      rawData: csvText
    };
  };

  // PDF parsing function using mammoth (for basic text extraction)
  const parsePDF = async (file: File) => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader();
      fileReader.onload = async function() {
        try {
          // For PDF parsing, we'll look for common patterns in the text
          // This is a simplified approach - in production, you'd want a more robust PDF parser
          const arrayBuffer = fileReader.result as ArrayBuffer;
          
          // Convert ArrayBuffer to text (this is a simplified approach)
          // In a real implementation, you'd use a proper PDF parsing library
          const uint8Array = new Uint8Array(arrayBuffer);
          let text = '';
          for (let i = 0; i < uint8Array.length; i++) {
            if (uint8Array[i] >= 32 && uint8Array[i] <= 126) {
              text += String.fromCharCode(uint8Array[i]);
            } else {
              text += ' ';
            }
          }

          let totalPoints = 0;
          let sessionData = {
            totalScore: 0,
            innerTens: 0,
            seriesScores: [],
            date: '',
            discipline: ''
          };

          // Look for common patterns in shooting score PDFs
          // Pattern 1: "Total: 555" or "Total Score: 555"
          const totalMatches = text.match(/(?:Total|Total Score|Final Score)[\s:]+(\d+)/gi);
          if (totalMatches) {
            const match = totalMatches[totalMatches.length - 1].match(/(\d+)/);
            if (match) {
              totalPoints = parseInt(match[1]);
              sessionData.totalScore = totalPoints;
            }
          }

          // Pattern 2: Look for scores in format "555/600" or "555 out of 600"
          const scoreMatches = text.match(/(\d+)[\s\/](?:out of\s)?(\d+)/gi);
          if (scoreMatches && !totalPoints) {
            for (const scoreMatch of scoreMatches) {
              const match = scoreMatch.match(/(\d+)/);
              if (match) {
                const score = parseInt(match[1]);
                if (score > totalPoints && score <= 1000) { // Reasonable shooting score range
                  totalPoints = score;
                  sessionData.totalScore = score;
                }
              }
            }
          }

          // Pattern 3: Look for Inner tens
          const innerTensMatches = text.match(/(?:Inner\s*tens?|X[\s-]*count|10\.9)[\s:]+(\d+)/gi);
          if (innerTensMatches) {
            const match = innerTensMatches[0].match(/(\d+)/);
            if (match) {
              sessionData.innerTens = parseInt(match[1]);
            }
          }

          // Pattern 4: Look for discipline
          const disciplinePatterns = [
            /(?:Air\s*)?Pistol\s*\d*/gi,
            /(?:Air\s*)?Rifle\s*\d*/gi,
            /10m\s*(?:Air\s*)?(?:Pistol|Rifle)/gi,
            /25m\s*Pistol/gi,
            /50m\s*(?:Pistol|Rifle)/gi
          ];

          for (const pattern of disciplinePatterns) {
            const match = text.match(pattern);
            if (match) {
              sessionData.discipline = match[0].trim();
              break;
            }
          }

          // Pattern 5: Look for dates
          const datePatterns = [
            /\d{1,2}[-\/]\d{1,2}[-\/]\d{4}/g,
            /\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/g
          ];

          for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
              sessionData.date = match[0];
              break;
            }
          }

          resolve({
            totalPoints,
            sessionData,
            rawData: text.substring(0, 1000) // Store first 1000 chars for debugging
          });

        } catch (error) {
          reject(error);
        }
      };

      fileReader.onerror = reject;
      fileReader.readAsArrayBuffer(file);
    });
  };

  const handleUpload = async () => {
    if (!file || !sessionName || !rangeName || !user || rating === 0) {
      setError("Please provide a session name, range name, rating (1-5 stars), and select a file.");
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

      let parsedResult;
      
      // Parse file based on type
      if (fileExtension === '.csv') {
        const fileContent = await file.text();
        parsedResult = parseCSV(fileContent);
      } else if (fileExtension === '.pdf') {
        parsedResult = await parsePDF(file);
      }

      const { totalPoints, sessionData: parsedSessionData } = parsedResult as any;

      if (totalPoints === 0) {
        setError(`Could not extract valid points from ${fileExtension.toUpperCase()} file. Please ensure the file contains score information.`);
        return;
      }

      // Get profile info
      const shooterDocRef = doc(db, "shooters", user.uid);
      const coacherDocRef = doc(db, "technical-coaches", user.uid);
      const shooterDoc = await getDoc(shooterDocRef);
      const coacherDoc = await getDoc(coacherDocRef);
      
      // Determine user role based on existing documents
      const isShooter = shooterDoc.exists();
      const isCoach = coacherDoc.exists();
      
      if (!isShooter && !isCoach) {
        setError("Profile not found. User must have a shooter or coach profile to upload sessions.");
        return;
      }
      
      // --- FIX STARTS HERE ---
      // We assume if a user uploads a session, it is for their own profile (if they are a shooter).
      // If they are a coach, they should ideally be choosing a student, but since that logic 
      // is not in the original code, we only allow updating the score IF a shooter profile exists.

      const shooterData = shooterDoc.data();
      const coacherData = coacherDoc.data();
      console.log("Shooter Data:", coacherData);
      
      // Define the target shooter ID and Name (for self-upload case)
      const targetShooterId = user.uid;
      const targetShooterName = isShooter ? (shooterData?.name || 'Unknown Shooter') : 'N/A (Coach Upload)';

      // Update shooter's total points ONLY IF the shooter document exists
      if (isShooter) {
          await updateDoc(shooterDocRef, {
              totalPoints: increment(totalPoints)
          });
      } else {
          // If the user is a coach but not a shooter, their score is not updated.
          // In a multi-user system, a coach should select a target student.
          // Since that logic isn't here, we just log a warning for now.
          console.warn("User is a coach, score update skipped. Session logged but points not added to self.");
      }
      // --- FIX ENDS HERE ---

      // Upload file to storage
      const fileName = `${targetShooterId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, `shooting-sessions/${fileName}`);
      await uploadBytes(storageRef, file);
      const fileDownloadURL = await getDownloadURL(storageRef);

      // Prepare session data
      const sessionDocData: any = {
        sessionName,
        rangeName,
        rating,
        fileName: file.name,
        fileType: fileExtension,
        pointsEarned: totalPoints,
        uploadDate: new Date(),
        fileUrl: fileDownloadURL,
        shooterId: targetShooterId, // Use the current user's ID
        shooterName: targetShooterName,
        coacherName: coacherData?.fullName || 'N/A',
        uploadedBy: isCoach ? `Coach (${user.uid})` : `Shooter`, // Add who uploaded it
        sessionStats: {
          totalScore: parsedSessionData.totalScore,
          innerTens: parsedSessionData.innerTens,
          discipline: parsedSessionData.discipline,
          date: parsedSessionData.date
        }
      };

      // Save session data to both collections
      // 1. Save to main shootingSessions collection
      const mainSessionsCollectionRef = collection(db, "shootingSessions");
      const mainSessionDocRef = await addDoc(mainSessionsCollectionRef, sessionDocData);

      // 2. Save to shooters/{id}/shootingSessions subcollection
      const userSessionsCollectionRef = collection(db, "shooters", targetShooterId, "shootingSessions");
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
      
      // Clear file input
      const fileInput = document.getElementById("session-file") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      toast({
        title: "Session Saved Successfully",
        description: `Session "${sessionName}" at ${rangeName} saved with ${fileExtension.toUpperCase()} file and ${totalPoints} points added!`,
      });

    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || `Failed to upload session data from ${file.name.split('.').pop()?.toUpperCase()} file.`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="w-full bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Shooting Session
          </CardTitle>
          <CardDescription>
            Upload your shooting session data from CSV or PDF files to add points to your profile.
            <span className="block mt-1 text-xs text-green-600 font-medium">
              File storage is free for all users - CSV and PDF supported
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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
                className="text-sm font-medium  mb-1 flex items-center gap-1"
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
                  disabled={!file || !sessionName || !rangeName || rating === 0 || uploading}
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

export default ShootingSessionUpload;
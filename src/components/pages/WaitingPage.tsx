import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { db } from "../../firebase/config";
import { signOut } from 'firebase/auth';

export default function WaitingPage() {
  const [file, setFile] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    if (!file) {
      alert("Please select a file first.");
      return;
    }

    if (!phone.trim()) {
      alert("Please enter your phone number.");
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to submit a document.");
      return;
    }

    setLoading(true);

    // Upload file to Firebase Storage
    const storage = getStorage();
    const storageRef = ref(storage, `range_licenses/${user.uid}/${file.name}`);
    await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);

    // Update existing range_owner doc
    await setDoc(
      doc(db, "range-owners", user.uid),
      {
        phone,
        documentURL: downloadURL,
        uploadedAt: new Date(),
      },
      { merge: true } // Keep existing data, add/update these fields
    );

    alert("Document uploaded successfully!");
    signOut(auth);
    navigate("/");
  } catch (err) {
    console.error("Error uploading document:", err);
    alert("Failed to upload document. Please try again.");
  } finally {
    setLoading(false);
  }
};

const handleSendViaMail = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("You must be logged in to perform this action.");
      return;
    }

    setLoading(true);

    await setDoc(
      doc(db, "range-owners", user.uid),
      {
        status: "pending",
        createdAt: new Date(),
      },
      { merge: true }
    );

    alert("Your request has been submitted. Please send the document via mail.");
    signOut(auth);
    navigate("/");
  } catch (err) {
    console.error("Error creating pending range-owner:", err);
    alert("Failed to submit request. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-8"
      style={{ backgroundImage: "url('/bgImage.jpg')" }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black bg-opacity-20"></div>
      
      <div className="relative z-10 bg-white rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-10 w-full max-w-md lg:max-w-lg xl:max-w-xl border border-gray-100 backdrop-blur-sm">
        {/* Header Section */}
        <header className="mb-8 text-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
            <svg 
              className="w-8 h-8 sm:w-10 sm:h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-2">
            Welcome to the Waiting Lounge
          </h1>
          <p className="text-gray-600 text-sm sm:text-base leading-relaxed">
            Please upload your range license for verification to proceed.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 sm:p-8 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 group">
            <label
              htmlFor="document"
              className="cursor-pointer flex flex-col items-center space-y-3"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7 16l-4-4m0 0l4-4m-4 4h18M13 16l4-4m0 0l-4-4m4 4H3"
                  />
                </svg>
              </div>
              <div className="text-center">
                <span className="text-gray-700 font-medium text-sm sm:text-base">
                  Click to upload your document
                </span>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  PDF, DOC, JPG, or PNG (max 5MB)
                </p>
              </div>
            </label>
            <input
              id="document"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.png"
              className="hidden"
            />
          </div>

          {/* Selected File Display */}
          {file && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-green-700 truncate">
                  {file.name}
                </span>
              </div>
            </div>
          )}

          {/* Phone Number Field */}
          <div className="space-y-2">
            <label htmlFor="phone" className="block font-semibold text-gray-700 text-sm sm:text-base">
              Contact Number *
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              className="w-full border border-gray-300 rounded-lg p-3 sm:p-4 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all duration-200 hover:border-gray-400"
            />
            <p className="text-xs sm:text-sm text-amber-600 bg-amber-50 p-2 rounded-md border border-amber-200">
              ℹ️ Our representative will contact you on this number for verification.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || !phone.trim() || loading}
            className={`w-full py-3 sm:py-4 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 transform ${
              file && phone.trim() && !loading
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] shadow-lg hover:shadow-xl"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Uploading...</span>
              </div>
            ) : (
              "Submit Document"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500">OR</span>
          </div>
        </div>

        {/* Mail Option Section */}
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 sm:p-6 border border-orange-200">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <p className="text-sm sm:text-base text-gray-700 font-medium">
                Prefer sending documents via mail?
              </p>
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                Send your documents to <span className="font-semibold text-blue-600">globalshootingleague@gmail.com</span>
              </p>
              <p className="text-xs sm:text-sm text-gray-600">
                For queries: <span className="font-semibold text-green-600">9992222333</span>
              </p>
            </div>

            <button
              type="button"
              onClick={handleSendViaMail}
              disabled={loading}
              className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold text-sm sm:text-base transition-all duration-200 transform ${
                loading
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-yellow-500 to-orange-500 text-white hover:from-yellow-600 hover:to-orange-600 hover:scale-[1.02] shadow-md hover:shadow-lg"
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Processing...</span>
                </div>
              ) : (
                "Send Document via Mail"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
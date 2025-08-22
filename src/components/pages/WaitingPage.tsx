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
    <div className="flex items-center justify-center min-h-screen h-screen bg-cover bg-center bg-gray-50 px-4"
    style={{ backgroundImage: "url('/bgImage.jpg')" }}>


      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center border border-gray-200">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Welcome to the Waiting Lounge
          </h1>
          <p className="text-gray-600 mt-2">
            Please upload your range license for verification.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 transition">
            <label
              htmlFor="document"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <svg
                className="w-10 h-10 text-gray-400"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16V4m0 0l-4 4m4-4l4 4M17 8v12m0 0l-4-4m4 4l4-4"
                />
              </svg>
              <span className="text-gray-600">Click to upload</span>
              <span className="text-xs text-gray-500">
                PDF, DOC, JPG, or PNG (max 5MB)
              </span>
            </label>
            <input
              id="document"
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.jpg,.png"
              className="hidden"
            />
          </div>

          {file && (
            <p className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full inline-block">
              {file.name}
            </p>
          )}

          {/* Phone Number Field */}
          <div className="text-left">
            <label htmlFor="phone" className="block font-medium text-gray-700">
              Contact Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your phone number"
              className="mt-1 block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-sm text-red-500 mt-1">
              Please provide your phone number so that our representative can
              contact you.
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!file || !phone.trim()}
            className={`w-full py-3 rounded-lg font-semibold transition ${
              file && phone.trim()
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Submit Document
          </button>
        </form>

        <div className="mt-4 text-center">
  <p className="text-sm text-gray-600 mb-2">
    If you want to send the document via mail, please press the button below and include your phone number in the mail.
  </p>
  <p className="text-sm text-gray-600 mb-2">Email is sample@gmail.com and for further query contact us at 9992222333</p>
  <button
    type="button"
    onClick={handleSendViaMail}
    disabled={loading}
    className={`px-4 py-2 rounded-lg font-semibold transition ${
      loading
        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
        : "bg-yellow-500 text-white hover:bg-yellow-600"
    }`}
  >
    Send Document via Mail
  </button>
</div>

      </div>
    </div>
  );
}

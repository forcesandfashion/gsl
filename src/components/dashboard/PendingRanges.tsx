import { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs, updateDoc, doc, query, where, writeBatch, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { sendWelcomeEmail } from "../../lib/emailService"; // adjust path

interface RangeOwner {
  id: string;
  username: string;
  email: string;
  status: string;
  role: string;
  premium: boolean;
  createdAt: any; // Firestore timestamp
  phone?: string;
  documentURL?: string;
}

export default function PendingRanges() {
  const [pendingRanges, setPendingRanges] = useState<RangeOwner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingRanges = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(
        query(collection(db, "range-owners"), where("status", "==", "pending"))
      );

      const owners: RangeOwner[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<RangeOwner, "id">;
        return { id: d.id, ...data };
      });

      setPendingRanges(owners);
    } catch (err) {
      console.error("Error fetching pending owners:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: "active" | "blocked") => {
    try {
      const ownerRef = doc(db, "range-owners", id);
      await updateDoc(ownerRef, { status });
      
      // If admin activates → send welcome email
      if (status === "active") {
        const ownerDoc = await getDoc(ownerRef);
        if (ownerDoc.exists()) {
          const docData = ownerDoc.data();
          const ownerData = { id: ownerDoc.id, ...docData } as RangeOwner;
          
          if (ownerData.email) {
            try {
              const emailSent = await sendWelcomeEmail(ownerData.email, ownerData.username || "Range Owner");
              if (emailSent) {
                alert(`📧 Welcome email sent to ${ownerData.email}`);
              } else {
                alert(`❌ Failed to send welcome email to ${ownerData.email}`);
              }
            } catch (emailError) {
              console.error("Error sending welcome email:", emailError);
              alert(`❌ Error sending welcome email to ${ownerData.email}`);
            }
          } else {
            console.warn("No email address found for owner:", ownerData.username);
          }
        }
      }

      if (status === "blocked") {
        const rangesSnapshot = await getDocs(
          query(collection(db, "ranges"), where("ownerId", "==", id))
        );

        for (const rangeDoc of rangesSnapshot.docs) {
          await updateDoc(doc(db, "ranges", rangeDoc.id), { status: "blocked" });
        }
      }

      fetchPendingRanges();
    } catch (err) {
      console.error(`Error updating owner to ${status}:`, err);
    }
  };

  // Complete delete function from ActiveRanges component
  const deleteUser = async (uid: string) => {
    const confirmDelete = window.confirm(
      "⚠ Are you sure you want to delete this user? This will also delete all their ranges, managers, and related bookings. This action cannot be undone."
    );
    
    if (!confirmDelete) return;

    try {
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        alert("❌ You must be logged in as an admin to perform this action.");
        return;
      }

      const idToken = await currentUser.getIdToken();

      // 🔹 Call backend Cloud Function to delete auth user + users collection doc
      const response = await fetch(
        "https://admindeleteuser-5uzq5pp2ia-uc.a.run.app",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ uid }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        console.error("Error deleting user:", data);
        alert(`❌ Failed to delete user: ${data}`);
        return;
      }

      // 🔹 Get all ranges owned by this user first (needed for booking deletion)
      const rangesQuery = query(collection(db, "ranges"), where("ownerId", "==", uid));
      const rangesSnapshot = await getDocs(rangesQuery);
      const rangeIds = rangesSnapshot.docs.map(doc => doc.id);

      console.log(`Found ${rangeIds.length} ranges owned by user ${uid}`);

      // 🔹 Start batch operations for better performance
      const batches = [];
      let currentBatch = writeBatch(db);
      let operationCount = 0;
      const maxBatchSize = 500; // Firestore batch limit

      // Helper function to add operation to batch
      const addToBatch = (operation: () => void) => {
        if (operationCount >= maxBatchSize) {
          batches.push(currentBatch);
          currentBatch = writeBatch(db);
          operationCount = 0;
        }
        operation();
        operationCount++;
      };

      // 🔹 Delete the user's document from range-owners
      addToBatch(() => {
        currentBatch.delete(doc(db, "range-owners", uid));
      });

      // 🔹 Delete all ranges owned by this user
      rangesSnapshot.docs.forEach((rangeDoc) => {
        addToBatch(() => {
          currentBatch.delete(rangeDoc.ref);
        });
      });

      // 🔹 Delete all managers with ownerId matching the range owner's id
      const managersQuery = query(collection(db, "managers"), where("ownerId", "==", uid));
      const managersSnapshot = await getDocs(managersQuery);
      
      console.log(`Found ${managersSnapshot.docs.length} managers for user ${uid}`);
      
      managersSnapshot.docs.forEach((managerDoc) => {
        addToBatch(() => {
          currentBatch.delete(managerDoc.ref);
        });
      });

      // 🔹 Delete all bookings for ranges owned by this user
      if (rangeIds.length > 0) {
        // Note: Firestore 'in' queries are limited to 10 items, so we need to chunk if more ranges
        const rangeIdChunks = [];
        for (let i = 0; i < rangeIds.length; i += 10) {
          rangeIdChunks.push(rangeIds.slice(i, i + 10));
        }

        for (const chunk of rangeIdChunks) {
          const bookingsQuery = query(collection(db, "bookings"), where("rangeId", "in", chunk));
          const bookingsSnapshot = await getDocs(bookingsQuery);
          
          console.log(`Found ${bookingsSnapshot.docs.length} bookings for range chunk`);
          
          bookingsSnapshot.docs.forEach((bookingDoc) => {
            addToBatch(() => {
              currentBatch.delete(bookingDoc.ref);
            });
          });
        }
      }

      // 🔹 Add the last batch if it has operations
      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      // 🔹 Execute all batches
      console.log(`Executing ${batches.length} batches with total operations`);
      await Promise.all(batches.map(batch => batch.commit()));

      // 🔹 Update local state
      setPendingRanges((prev) => prev.filter((user) => user.id !== uid));

      alert(`✅ User ${uid} and all associated data (ranges, managers, bookings) have been deleted successfully.`);
      
      console.log(`Successfully deleted:
        - User document from range-owners
        - ${rangeIds.length} ranges
        - ${managersSnapshot.docs.length} managers
        - All related bookings`);

    } catch (err) {
      console.error("Error deleting user and associated data:", err);
      alert("❌ An error occurred while deleting user. Please try again.");
    }
  };

  useEffect(() => {
    fetchPendingRanges();
  }, []);

  if (loading) return <p className="text-gray-500 text-center mt-10">Loading pending ranges...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Pending Range Owners</h1>

      {pendingRanges.length === 0 ? (
        <p className="text-gray-500">No pending range owners.</p>
      ) : (
        <ul className="space-y-4">
          {pendingRanges.map((owner) => (
            <li
              key={owner.id}
              className="flex items-center justify-between p-5 border border-gray-200 rounded-2xl shadow-md bg-white hover:shadow-lg transition"
            >
              <div>
                <p className="font-semibold text-gray-800 text-lg">
                  {owner.username || "No Name"}
                </p>
                <p className="text-sm text-gray-500">{owner.email}</p>
                <p className="text-sm text-gray-500">📞 {owner.phone || "No phone provided"}</p>
                <span className="inline-block mt-1 px-3 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-full">
                  {owner.status}
                </span>
                <div className="mt-2">
                  {owner.documentURL ? (
                    <a
                      href={owner.documentURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition shadow-sm"
                    >
                      📄 Download Document
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Document sent via mail</p>
                  )}

                  {/* Also check if email or phone is missing */}
                  {(!owner.email || !owner.phone) && (
                    <p className="text-sm text-gray-500 italic mt-1">Document sent via mail</p>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => updateStatus(owner.id, "active")}
                  className="px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition font-medium shadow-sm"
                >
                  Activate
                </button>

                <button
                  onClick={() => deleteUser(owner.id)}
                  className="px-4 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition font-medium shadow-sm"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
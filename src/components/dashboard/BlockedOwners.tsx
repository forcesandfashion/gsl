import { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs, updateDoc, doc, query, where, writeBatch } from "firebase/firestore";

interface RangeOwner {
  id: string;
  username: string;
  email: string;
  status: string;
}

export default function BlockedOwners() {
  const [blockedOwners, setBlockedOwners] = useState<RangeOwner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBlockedOwners = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(
        query(collection(db, "range-owners"), where("status", "==", "blocked"))
      );

      const owners: RangeOwner[] = snapshot.docs.map((d) => {
        const data = d.data() as Omit<RangeOwner, "id">;
        return { id: d.id, ...data };
      });

      setBlockedOwners(owners);
    } catch (err) {
      console.error("Error fetching blocked owners:", err);
    } finally {
      setLoading(false);
    }
  };

  const unblockOwner = async (id: string) => {
    try {
      // Update the owner's status to active
      await updateDoc(doc(db, "range-owners", id), { status: "active" });

      // Find and update all ranges owned by this user
      const rangesQuery = query(
        collection(db, "ranges"), 
        where("ownerId", "==", id)
      );
      const rangesSnapshot = await getDocs(rangesQuery);

      if (!rangesSnapshot.empty) {
        // Use batch write for better performance when updating multiple documents
        const batch = writeBatch(db);
        
        rangesSnapshot.docs.forEach((rangeDoc) => {
          batch.update(rangeDoc.ref, { status: "active" });
        });
        
        await batch.commit();
        console.log(`Unblocked ${rangesSnapshot.docs.length} ranges for user ${id}`);
      }

      // Refresh the list
      fetchBlockedOwners();
      alert("✅ Owner and all their ranges have been unblocked.");
    } catch (err) {
      console.error("Error unblocking owner:", err);
      alert("❌ Error occurred while unblocking owner. Please try again.");
    }
  };

  useEffect(() => {
    fetchBlockedOwners();
  }, []);

  if (loading) return <p className="text-gray-500 text-center mt-10">Loading blocked owners...</p>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Blocked Range Owners</h1>

      {blockedOwners.length === 0 ? (
        <p className="text-gray-500">No blocked owners.</p>
      ) : (
        <ul className="space-y-4">
          {blockedOwners.map((owner) => (
            <li
              key={owner.id}
              className="flex items-center justify-between p-5 border border-gray-200 rounded-2xl shadow-md bg-white hover:shadow-lg transition"
            >
              <div>
                <p className="font-semibold text-gray-800 text-lg">{owner.username || "No Name"}</p>
                <p className="text-sm text-gray-500">{owner.email}</p>
                <span className="inline-block mt-1 px-3 py-1 text-xs font-semibold text-red-800 bg-red-100 rounded-full">
                  {owner.status}
                </span>
              </div>
              <button
                onClick={() => unblockOwner(owner.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium shadow-sm"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
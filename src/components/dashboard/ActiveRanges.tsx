import { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs, updateDoc, doc, deleteDoc, query, where, writeBatch } from "firebase/firestore";

interface ActiveRange {
  id: string;
  username: string;
  email: string;
  phone?: string;
  status: string;
  documentURL?: string;
}

export default function ActiveRanges() {
  const [activeRanges, setActiveRanges] = useState<ActiveRange[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchActiveRanges = async () => {
    try {
      setLoading(true);
      const snapshot = await getDocs(collection(db, "range-owners"));
      const activeList: ActiveRange[] = snapshot.docs
        .map((d) => {
          const data = d.data() as Omit<ActiveRange, "id">;
          return { id: d.id, ...data };
        })
        .filter((item) => item.status === "active");

      setActiveRanges(activeList);
    } catch (err) {
      console.error("Error fetching active ranges:", err);
    } finally {
      setLoading(false);
    }
  };

  const blockUser = async (id: string) => {
    try {
      // Update the user's status to blocked
      await updateDoc(doc(db, "range-owners", id), { status: "blocked" });
      
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
          batch.update(rangeDoc.ref, { status: "blocked" });
        });
        
        await batch.commit();
        console.log(`Blocked ${rangesSnapshot.docs.length} ranges for user ${id}`);
      }
      
      // Remove from local state
      setActiveRanges((prev) => prev.filter((user) => user.id !== id));
      alert("✅ User and all their ranges have been blocked.");
    } catch (err) {
      console.error("Error blocking user and ranges:", err);
      alert("❌ Error occurred while blocking user. Please try again.");
    }
  };

  const deleteUser = async (id: string) => {
    const confirmDelete = window.confirm(
      "⚠ Are you sure you want to delete this range owner? This action cannot be undone and will also delete all their ranges."
    );
    if (!confirmDelete) return;

    try {
      // Find and delete all ranges owned by this user
      const rangesQuery = query(
        collection(db, "ranges"), 
        where("ownerId", "==", id)
      );
      const rangesSnapshot = await getDocs(rangesQuery);
      
      if (!rangesSnapshot.empty) {
        // Use batch write for better performance when deleting multiple documents
        const batch = writeBatch(db);
        
        rangesSnapshot.docs.forEach((rangeDoc) => {
          batch.delete(rangeDoc.ref);
        });
        
        await batch.commit();
        console.log(`Deleted ${rangesSnapshot.docs.length} ranges for user ${id}`);
      }
      
      // Delete the user document
      await deleteDoc(doc(db, "range-owners", id));
      
      // Remove from local state
      setActiveRanges((prev) => prev.filter((user) => user.id !== id));
      alert("🗑 User and all their ranges have been deleted.");
    } catch (err) {
      console.error("Error deleting user and ranges:", err);
      alert("❌ Error occurred while deleting user. Please try again.");
    }
  };

  useEffect(() => {
    fetchActiveRanges();
  }, []);

  const filteredRanges = activeRanges.filter(
    (owner) =>
      owner.username?.toLowerCase().includes(search.toLowerCase()) ||
      owner.email?.toLowerCase().includes(search.toLowerCase()) ||
      owner.phone?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Active Range Owners
      </h1>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <p className="text-gray-500 text-center mt-10">Loading active ranges...</p>
      ) : filteredRanges.length === 0 ? (
        <p className="text-gray-500 text-center">No active range owners found.</p>
      ) : (
        <ul className="space-y-4">
          {filteredRanges.map((owner) => (
            <li
              key={owner.id}
              className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-gray-200 rounded-2xl shadow-md bg-white hover:shadow-lg transition-shadow"
            >
              <div className="flex-1 mb-4 md:mb-0">
                <p className="font-semibold text-gray-800 text-lg">
                  {owner.username || "No Name"}
                </p>
                <p className="text-sm text-gray-500">📧 {owner.email || "No Email"}</p>
                <p className="text-sm text-gray-500">📞 {owner.phone || "No Phone"}</p>

                {owner.documentURL ? (
                  <a
                    href={owner.documentURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-1 px-3 py-1 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-sm"
                  >
                    📄 Download Document
                  </a>
                ) : (
                  <p className="text-sm text-gray-400 italic mt-1">Document not uploaded</p>
                )}

                <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">
                  {owner.status}
                </span>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => blockUser(owner.id)}
                  className="px-5 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition font-medium shadow-sm"
                >
                  Block
                </button>
                <button
                  onClick={() => deleteUser(owner.id)}
                  className="px-5 py-2 bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition font-medium shadow-sm"
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
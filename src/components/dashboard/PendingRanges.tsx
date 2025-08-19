import { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs, updateDoc, doc, query, where, deleteDoc } from "firebase/firestore";

interface RangeOwner {
  id: string;
  username: string;
  email: string;
  phone?: string;
  status: string;
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
      await updateDoc(doc(db, "range-owners", id), { status });

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

  const deleteOwner = async (id: string) => {
    const confirmDelete = window.confirm(
      "⚠ Are you sure you want to delete this pending range owner? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "range-owners", id));
      setPendingRanges((prev) => prev.filter((owner) => owner.id !== id));
      alert("🗑 Pending range owner deleted successfully.");
    } catch (err) {
      console.error("Error deleting pending owner:", err);
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
                  onClick={() => deleteOwner(owner.id)}
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

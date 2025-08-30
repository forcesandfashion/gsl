// src/pages/AssistantAccounts.tsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserPlus, User as UserIcon, Mail, Shield, Calendar } from "lucide-react";

interface Manager {
  uid: string;
  name: string;
  email: string;
  role: string;
  createdAt: any;
  ownerId: string;
  status: "active" | "blocked";
  docId?: string;
}

const AssistantAccounts: React.FC = () => {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [owner, setOwner] = useState<User | null>(null);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  const MAX_MANAGERS = 3;

  // Track logged in range owner
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setOwner(user);
        setTimeout(() => {
          fetchManagers(user.uid);
        }, 500);
      } else {
        setOwner(null);
        setManagers([]);
      }
    });
    return () => unsub();
  }, []);

  // Fetch managers from Firestore
  const fetchManagers = async (ownerUid?: string) => {
    if (!ownerUid) return;
    setLoading(true);
    try {
      const snapshot = await getDocs(
        collection(db, "range-owners", ownerUid, "managers")
      );
      const data: Manager[] = snapshot.docs.map((docSnap) => ({
        ...(docSnap.data() as Manager),
        docId: docSnap.id,
      }));
      setManagers(data);
    } catch (err) {
      console.error("Error fetching managers:", err);
    }
    setLoading(false);
  };

  // Create manager via HTTP
  const createManager = async () => {
    if (!owner) {
      alert("You must be logged in as a range owner.");
      return;
    }
    if (!name || !email || !password) {
      alert("Please fill all fields");
      return;
    }

    setCreating(true);
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No authenticated user found");
      }

      const idToken = await currentUser.getIdToken(true);
      
      const response = await fetch(`https://us-central1-global-shooting-league.cloudfunctions.net/createManagerHttp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password: password.trim()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("Manager created:", result);

      setName("");
      setEmail("");
      setPassword("");
      setModalOpen(false);
      await fetchManagers(owner.uid);

      alert("✅ Manager account created successfully!");
    } catch (err: any) {
      console.error("Error creating manager:", err);
      alert("❌ " + err.message);
    } finally {
      setCreating(false);
    }
  };

  // Block / Unblock manager
  const toggleBlock = async (manager: Manager) => {
    if (!owner || !manager.docId) return;
    
    try {
      const docRef = doc(
        db,
        "range-owners",
        owner.uid,
        "managers",
        manager.docId
      );
      const newStatus = manager.status === "active" ? "blocked" : "active";
      await updateDoc(docRef, { status: newStatus });
      
      // Update local state immediately for better UX
      setManagers(prev => 
        prev.map(m => 
          m.uid === manager.uid 
            ? { ...m, status: newStatus }
            : m
        )
      );
      
      alert(`✅ Manager ${newStatus === "blocked" ? "blocked" : "unblocked"} successfully!`);
    } catch (err) {
      console.error("Error updating status:", err);
      alert("❌ Failed to update manager status");
    }
  };

  // Delete manager via HTTP
  const deleteManager = async (manager: Manager) => {
    if (!owner || !manager.uid) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${manager.name}? This action cannot be undone.`
    );
    if (!confirmDelete) return;

    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("No authenticated user found");
      }

      const idToken = await currentUser.getIdToken(true);
      
      const response = await fetch(`https://us-central1-global-shooting-league.cloudfunctions.net/deleteManagerHttp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          managerUid: manager.uid
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("Manager deleted:", result);

      // Remove from local state immediately
      setManagers(prev => prev.filter(m => m.uid !== manager.uid));
      
      alert("✅ Manager deleted successfully!");
    } catch (err: any) {
      console.error("Error deleting manager:", err);
      alert("❌ " + err.message);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString();
    } catch {
      return "N/A";
    }
  };

  const canCreateMore = managers.length < MAX_MANAGERS;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard/range-owner')}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
                <span>Back to Dashboard</span>
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Management Accounts</h1>
                <p className="text-gray-600 mt-1">
                  Manage your range assistant accounts ({managers.length}/{MAX_MANAGERS} used)
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${
                canCreateMore && owner
                  ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!owner || !canCreateMore}
            >
              <UserPlus size={20} />
              <span>Add Manager</span>
            </button>
          </div>
        </div>

        {/* Auth Status */}
        <div className="bg-white rounded-xl shadow-md p-4 mb-8">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${owner ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <p className="text-sm font-medium">
              {owner ? `Logged in as ${owner.email}` : "Not logged in"}
            </p>
          </div>
        </div>

        {/* Manager Limit Warning */}
        {!canCreateMore && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <p className="text-amber-800 font-medium">
                You've reached the maximum limit of {MAX_MANAGERS} manager accounts.
              </p>
            </div>
          </div>
        )}

        {/* Manager Cards */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : !owner ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <p className="text-red-500 text-lg">Please log in as a range owner.</p>
          </div>
        ) : managers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center">
            <UserIcon size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Manager Accounts</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first manager account.</p>
            <button
              onClick={() => setModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              disabled={!canCreateMore}
            >
              Create First Manager
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {managers.map((manager) => (
              <div
                key={manager.uid}
                className={`bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 overflow-hidden ${
                  manager.status === "blocked" ? "opacity-75" : ""
                }`}
              >
                <div className="p-6">
                  {/* Status Badge */}
                  <div className="flex justify-between items-start mb-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      manager.status === "active" 
                        ? "bg-green-100 text-green-800" 
                        : "bg-red-100 text-red-800"
                    }`}>
                      {manager.status === "active" ? "Active" : "Blocked"}
                    </div>
                    <div className="flex items-center space-x-1 text-gray-400">
                      <Shield size={16} />
                      <span className="text-xs">{manager.role}</span>
                    </div>
                  </div>

                  {/* Manager Info */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <UserIcon size={20} className="text-gray-400" />
                      <div>
                        <p className="font-semibold text-gray-800">{manager.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Mail size={20} className="text-gray-400" />
                      <p className="text-gray-600 text-sm">{manager.email}</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Calendar size={20} className="text-gray-400" />
                      <p className="text-gray-500 text-sm">Created: {formatDate(manager.createdAt)}</p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="border-t bg-gray-50 px-6 py-4">
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => toggleBlock(manager)}
                      className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        manager.status === "active"
                          ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                          : "bg-green-100 text-green-800 hover:bg-green-200"
                      }`}
                    >
                      {manager.status === "active" ? "Block" : "Unblock"}
                    </button>
                    <button 
                      onClick={() => deleteManager(manager)}
                      className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {modalOpen && owner && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-800">Create Manager Account</h2>
                <p className="text-gray-600 text-sm mt-1">Add a new assistant to help manage your range</p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="Enter manager's name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={creating}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                  <input
                    type="email"
                    placeholder="manager@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={creating}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <input
                    type="password"
                    placeholder="Create a secure password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={createManager}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                  disabled={creating}
                >
                  {creating && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>{creating ? "Creating..." : "Create Manager"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantAccounts;
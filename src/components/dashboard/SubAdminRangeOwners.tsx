import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../firebase/config';
import { Trash2, UserCheck, UserX, User, Mail, Phone, FileText, Calendar, Loader } from 'lucide-react';

export default function SubAdminRangeOwners() {
    const [rangeOwners, setRangeOwners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending');
    const [updating, setUpdating] = useState({});

    // Fetch range owners from Firestore
    const fetchRangeOwners = async () => {
        try {
            setLoading(true);
            const rangeOwnersRef = collection(db, 'range-owners');
            const snapshot = await getDocs(rangeOwnersRef);
            const owners = [];
            
            snapshot.forEach((doc) => {
                owners.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            setRangeOwners(owners);
        } catch (error) {
            console.error('Error fetching range owners:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update range owner status
    const updateRangeOwnerStatus = async (ownerId, newStatus) => {
        try {
            setUpdating(prev => ({ ...prev, [ownerId]: true }));
            
            const ownerRef = doc(db, 'range-owners', ownerId);
            await updateDoc(ownerRef, {
                status: newStatus,
                updatedAt: new Date()
            });
            
            // Refresh the data
            await fetchRangeOwners();
        } catch (error) {
            console.error('Error updating range owner status:', error);
        } finally {
            setUpdating(prev => ({ ...prev, [ownerId]: false }));
        }
    };

    // Complete delete function from ActiveRanges component
    const deleteUser = async (uid) => {
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
            const addToBatch = (operation) => {
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
            setRangeOwners((prev) => prev.filter((user) => user.id !== uid));

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
        fetchRangeOwners();
    }, []);

    // Filter range owners by status
    const pendingOwners = rangeOwners.filter(owner => owner.status === 'pending');
    const activeOwners = rangeOwners.filter(owner => owner.status === 'active');
    const blockedOwners = rangeOwners.filter(owner => owner.status === 'blocked');

    // Render range owner card
    const RangeOwnerCard = ({ owner, showActions, actionType }) => (
        <div key={owner.id} className="border rounded-lg shadow-sm mb-6 bg-white overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <User size={20} />
                        {owner.username || 'Unknown Name'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
                        owner.status === 'active' ? 'bg-green-100 text-green-800' :
                        owner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                        {owner.status?.toUpperCase()}
                    </span>
                </div>
                <p className="text-xs text-gray-500">UID: {owner.uid || owner.id}</p>
            </div>
            <div className="p-4">
                <div className="space-y-3">
                    <div className="flex items-center">
                        <Mail size={16} className="text-gray-500 mr-2" />
                        <span className="text-sm text-gray-700">{owner.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center">
                        <Phone size={16} className="text-gray-500 mr-2" />
                        <span className="text-sm text-gray-700">{owner.phone || 'N/A'}</span>
                    </div>
                    {owner.documentURL && (
                        <div className="flex items-center">
                            <FileText size={16} className="text-gray-500 mr-2" />
                            <a 
                                href={owner.documentURL} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline text-sm"
                            >
                                View Document
                            </a>
                        </div>
                    )}
                    <div className="flex items-center">
                        <Calendar size={16} className="text-gray-500 mr-2" />
                        <span className="text-sm text-gray-700">
                            {owner.createdAt ? new Date(owner.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>
                </div>
                
                {showActions && (
                    <div className="mt-4 flex flex-wrap gap-2">
                        {actionType === 'approve' && (
                            <>
                                <button 
                                    onClick={() => updateRangeOwnerStatus(owner.id, 'active')}
                                    disabled={updating[owner.id]}
                                    className="flex items-center gap-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded transition-colors text-sm"
                                >
                                    {updating[owner.id] ? <Loader size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                    {updating[owner.id] ? 'Approving...' : 'Approve'}
                                </button>
                                <button 
                                    onClick={() => deleteUser(owner.id)}
                                    disabled={updating[owner.id]}
                                    className="flex items-center gap-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded transition-colors text-sm"
                                >
                                    <Trash2 size={16} />
                                    Reject
                                </button>
                            </>
                        )}
                        {actionType === 'block' && (
                            <button 
                                onClick={() => updateRangeOwnerStatus(owner.id, 'blocked')}
                                disabled={updating[owner.id]}
                                className="flex items-center gap-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded transition-colors text-sm"
                            >
                                {updating[owner.id] ? <Loader size={16} className="animate-spin" /> : <UserX size={16} />}
                                {updating[owner.id] ? 'Blocking...' : 'Block'}
                            </button>
                        )}
                        {actionType === 'unblock' && (
                            <button 
                                onClick={() => updateRangeOwnerStatus(owner.id, 'active')}
                                disabled={updating[owner.id]}
                                className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded transition-colors text-sm"
                            >
                                {updating[owner.id] ? <Loader size={16} className="animate-spin" /> : <UserCheck size={16} />}
                                {updating[owner.id] ? 'Unblocking...' : 'Unblock'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="flex flex-col items-center">
                    <Loader size={32} className="animate-spin text-blue-500 mb-2" />
                    <div className="text-lg text-gray-600">Loading range owners...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-5 border-b bg-white shadow-sm'>
                <h1 className='text-2xl sm:text-3xl font-bold text-gray-800 mb-3 sm:mb-0'>Range Owners Management</h1>
                <button 
                    onClick={() => window.history.back()} 
                    className='bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition-colors text-sm sm:text-base self-end sm:self-auto'
                >
                    Back
                </button>
            </div>
            
            <div className="p-4 sm:p-5">
                {/* Custom Tabs */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    {/* Tab Headers */}
                    <div className="flex flex-col sm:flex-row border-b">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
                                activeTab === 'pending' 
                                    ? 'border-yellow-500 bg-yellow-50 text-yellow-700 font-medium' 
                                    : 'border-transparent hover:bg-gray-50 text-gray-600'
                            }`}
                        >
                            <span>Pending</span>
                            {pendingOwners.length > 0 && (
                                <span className="bg-yellow-500 text-white rounded-full px-2 py-1 text-xs">
                                    {pendingOwners.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
                                activeTab === 'active' 
                                    ? 'border-green-500 bg-green-50 text-green-700 font-medium' 
                                    : 'border-transparent hover:bg-gray-50 text-gray-600'
                            }`}
                        >
                            <span>Active</span>
                            {activeOwners.length > 0 && (
                                <span className="bg-green-500 text-white rounded-full px-2 py-1 text-xs">
                                    {activeOwners.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('blocked')}
                            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors flex items-center justify-center gap-2 ${
                                activeTab === 'blocked' 
                                    ? 'border-red-500 bg-red-50 text-red-700 font-medium' 
                                    : 'border-transparent hover:bg-gray-50 text-gray-600'
                            }`}
                        >
                            <span>Blocked</span>
                            {blockedOwners.length > 0 && (
                                <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                                    {blockedOwners.length}
                                </span>
                            )}
                        </button>
                    </div>
                    
                    {/* Tab Content */}
                    <div className="p-4 sm:p-6">
                        {activeTab === 'pending' && (
                            <div>
                                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                                    <User size={24} className="text-yellow-500" />
                                    Pending Range Owners
                                </h2>
                                {pendingOwners.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                                        <User size={48} className="mx-auto text-gray-400 mb-3" />
                                        <p className="text-gray-500">No pending range owners found.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {pendingOwners.map(owner => (
                                            <RangeOwnerCard 
                                                key={owner.id}
                                                owner={owner} 
                                                showActions={true} 
                                                actionType="approve" 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'active' && (
                            <div>
                                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                                    <UserCheck size={24} className="text-green-500" />
                                    Active Range Owners
                                </h2>
                                {activeOwners.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                                        <UserCheck size={48} className="mx-auto text-gray-400 mb-3" />
                                        <p className="text-gray-500">No active range owners found.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {activeOwners.map(owner => (
                                            <RangeOwnerCard 
                                                key={owner.id}
                                                owner={owner} 
                                                showActions={true} 
                                                actionType="block" 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {activeTab === 'blocked' && (
                            <div>
                                <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
                                    <UserX size={24} className="text-red-500" />
                                    Blocked Range Owners
                                </h2>
                                {blockedOwners.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                                        <UserX size={48} className="mx-auto text-gray-400 mb-3" />
                                        <p className="text-gray-500">No blocked range owners found.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {blockedOwners.map(owner => (
                                            <RangeOwnerCard 
                                                key={owner.id}
                                                owner={owner} 
                                                showActions={true} 
                                                actionType="unblock" 
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
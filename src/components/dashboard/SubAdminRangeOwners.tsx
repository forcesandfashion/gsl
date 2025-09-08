import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';

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

    useEffect(() => {
        fetchRangeOwners();
    }, []);

    // Filter range owners by status
    const pendingOwners = rangeOwners.filter(owner => owner.status === 'pending');
    const activeOwners = rangeOwners.filter(owner => owner.status === 'active');
    const blockedOwners = rangeOwners.filter(owner => owner.status === 'blocked');

    // Render range owner card
    const RangeOwnerCard = ({ owner, showActions, actionType }) => (
        <div key={owner.id} className="border rounded-lg shadow-sm mb-4 bg-white">
            <div className="p-4 border-b">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">{owner.username || 'Unknown Name'}</h3>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                        owner.status === 'active' ? 'bg-green-100 text-green-800' :
                        owner.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                        {owner.status?.toUpperCase()}
                    </span>
                </div>
                <p className="text-sm text-gray-600">UID: {owner.uid || owner.id}</p>
            </div>
            <div className="p-4">
                <div className="space-y-3">
                    <div className="flex">
                        <span className="font-medium w-20">Email:</span>
                        <span className="text-gray-700">{owner.email || 'N/A'}</span>
                    </div>
                    <div className="flex">
                        <span className="font-medium w-20">Phone:</span>
                        <span className="text-gray-700">{owner.phone || 'N/A'}</span>
                    </div>
                    {owner.documentURL && (
                        <div className="flex">
                            <span className="font-medium w-20">Document:</span>
                            <a 
                                href={owner.documentURL} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                            >
                                View Document
                            </a>
                        </div>
                    )}
                    <div className="flex">
                        <span className="font-medium w-20">Created:</span>
                        <span className="text-gray-700">
                            {owner.createdAt ? new Date(owner.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </span>
                    </div>
                </div>
                
                {showActions && (
                    <div className="mt-4 space-x-2">
                        {actionType === 'approve' && (
                            <button 
                                onClick={() => updateRangeOwnerStatus(owner.id, 'active')}
                                disabled={updating[owner.id]}
                                className="bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-2 rounded transition-colors"
                            >
                                {updating[owner.id] ? 'Approving...' : 'Approve'}
                            </button>
                        )}
                        {actionType === 'block' && (
                            <button 
                                onClick={() => updateRangeOwnerStatus(owner.id, 'blocked')}
                                disabled={updating[owner.id]}
                                className="bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-2 rounded transition-colors"
                            >
                                {updating[owner.id] ? 'Blocking...' : 'Block'}
                            </button>
                        )}
                        {actionType === 'unblock' && (
                            <button 
                                onClick={() => updateRangeOwnerStatus(owner.id, 'active')}
                                disabled={updating[owner.id]}
                                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded transition-colors"
                            >
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
                <div className="text-lg">Loading range owners...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className='flex justify-between p-5 border border-black bg-white'>
                <h1 className='text-4xl px-2 font-bold'>Range Owners</h1>
                <button 
                    onClick={() => window.history.back()} 
                    className='bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded transition-colors'
                >
                    Back
                </button>
            </div>
            
            <div className="p-5">
                {/* Custom Tabs */}
                <div className="bg-white rounded-lg shadow-sm">
                    {/* Tab Headers */}
                    <div className="flex border-b">
                        <button
                            onClick={() => setActiveTab('pending')}
                            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
                                activeTab === 'pending' 
                                    ? 'border-yellow-500 bg-yellow-50 text-yellow-700 font-medium' 
                                    : 'border-transparent hover:bg-gray-50'
                            }`}
                        >
                            <span>Pending</span>
                            {pendingOwners.length > 0 && (
                                <span className="ml-2 bg-yellow-500 text-white rounded-full px-2 py-1 text-xs">
                                    {pendingOwners.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('active')}
                            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
                                activeTab === 'active' 
                                    ? 'border-green-500 bg-green-50 text-green-700 font-medium' 
                                    : 'border-transparent hover:bg-gray-50'
                            }`}
                        >
                            <span>Active</span>
                            {activeOwners.length > 0 && (
                                <span className="ml-2 bg-green-500 text-white rounded-full px-2 py-1 text-xs">
                                    {activeOwners.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('blocked')}
                            className={`flex-1 py-3 px-4 text-center border-b-2 transition-colors ${
                                activeTab === 'blocked' 
                                    ? 'border-red-500 bg-red-50 text-red-700 font-medium' 
                                    : 'border-transparent hover:bg-gray-50'
                            }`}
                        >
                            <span>Blocked</span>
                            {blockedOwners.length > 0 && (
                                <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                                    {blockedOwners.length}
                                </span>
                            )}
                        </button>
                    </div>
                    
                    {/* Tab Content */}
                    <div className="p-6">
                        {activeTab === 'pending' && (
                            <div>
                                <h2 className="text-2xl font-semibold mb-4">Pending Range Owners</h2>
                                {pendingOwners.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No pending range owners found.</p>
                                    </div>
                                ) : (
                                    <div>
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
                                <h2 className="text-2xl font-semibold mb-4">Active Range Owners</h2>
                                {activeOwners.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No active range owners found.</p>
                                    </div>
                                ) : (
                                    <div>
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
                                <h2 className="text-2xl font-semibold mb-4">Blocked Range Owners</h2>
                                {blockedOwners.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-gray-500">No blocked range owners found.</p>
                                    </div>
                                ) : (
                                    <div>
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
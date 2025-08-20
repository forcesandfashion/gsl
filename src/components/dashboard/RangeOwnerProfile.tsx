import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router'
import { db, auth } from "../../firebase/config";
import { collection, getDocs, query, where, doc, updateDoc, getDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { onAuthStateChanged } from "firebase/auth";
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';

export default function RangeOwnerProfile() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [logoUrl, setLogoUrl] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [ownerData, setOwnerData] = useState({
        name: '',
        phone: '',
        description: '',
        logo: null,
    });
    const [ranges, setRanges] = useState([]);
    const [ownerId, setOwnerId] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef(null);

    const handleGoBack = () => {
        navigate("/");
    }

    const fetchOwnerData = async () => {
        setLoading(true);
        try {
            if (ownerId) {
                const ownerDocRef = doc(db, "range-owners", ownerId);
                const ownerDocSnap = await getDoc(ownerDocRef);
                
                if (ownerDocSnap.exists()) {
                    const data = ownerDocSnap.data();
                    setOwnerData({
                        name: data.name || data.username || '',
                        phone: data.phone || '',
                        description: data.description || '',
                        logo: data.logoUrl || null
                    });
                    if (data.logoUrl) {
                        setLogoUrl(data.logoUrl);
                    }
                }
                
                // Fetch ranges
                const rangesQuery = query(
                    collection(db, "ranges"), 
                    where("ownerId", "==", ownerId)
                );
                const rangesResponse = await getDocs(rangesQuery);
                const rangesData = rangesResponse.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setRanges(rangesData);
            }
        } catch (error) {
            console.error('Error fetching owner data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Logo upload handlers
    const uploadLogoToStorage = async (file) => {
        try {
            const storage = getStorage();
            const timestamp = Date.now();
            const fileName = `logos/range-owner-${ownerId}-${timestamp}.${file.name.split('.').pop()}`;
            const storageRef = ref(storage, fileName);
            
            // Upload file
            const snapshot = await uploadBytes(storageRef, file);
            
            // Get download URL
            const downloadURL = await getDownloadURL(snapshot.ref);
            return downloadURL;
        } catch (error) {
            console.error('Error uploading logo:', error);
            throw error;
        }
    };

    const deleteOldLogo = async (logoUrl) => {
        try {
            if (logoUrl && logoUrl.includes('firebase')) {
                const storage = getStorage();
                const logoRef = ref(storage, logoUrl);
                await deleteObject(logoRef);
            }
        } catch (error) {
            console.error('Error deleting old logo:', error);
            // Don't throw error here as it's not critical
        }
    };

    const handleLogoUpload = async (event) => {
        const file = event.target.files[0];
        if (file) {
            setIsUploading(true);
            try {
                // Delete old logo if exists
                if (ownerData.logo) {
                    await deleteOldLogo(ownerData.logo);
                }
                
                // Upload new logo
                const logoUrl = await uploadLogoToStorage(file);
                
                // Update local state
                setLogoUrl(logoUrl);
                setOwnerData(prev => ({
                    ...prev,
                    logo: logoUrl
                }));
                
                console.log('Logo uploaded successfully:', logoUrl);
            } catch (error) {
                console.error('Error uploading logo:', error);
                alert('Error uploading logo. Please try again.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    const handleDragOver = (e) => {
        e.preventDefault();
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('image/')) {
            const file = files[0];
            setIsUploading(true);
            try {
                // Delete old logo if exists
                if (ownerData.logo) {
                    await deleteOldLogo(ownerData.logo);
                }
                
                // Upload new logo
                const logoUrl = await uploadLogoToStorage(file);
                
                // Update local state
                setLogoUrl(logoUrl);
                setOwnerData(prev => ({
                    ...prev,
                    logo: logoUrl
                }));
            } catch (error) {
                console.error('Error uploading logo:', error);
                alert('Error uploading logo. Please try again.');
            } finally {
                setIsUploading(false);
            }
        }
    };

    // Carousel handlers
    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % ranges.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + ranges.length) % ranges.length);
    };

    const handleSaveProfile = async () => {
        setIsSaving(true);
        try {
            const profileData = {
                name: ownerData.name,
                phone: ownerData.phone,
                description: ownerData.description,
                logoUrl: logoUrl,
                updatedAt: new Date()
            };
            
            const docRef = doc(db, "range-owners", ownerId);
            await updateDoc(docRef, profileData);
            
            alert("Profile saved successfully!");
        } catch (error) {
            console.error('Error saving profile:', error);
            alert("Error saving profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setOwnerData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    useEffect(() => {
        // Set up authentication listener
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setOwnerId(user.uid);
            } else {
                navigate('/login'); // Redirect if not authenticated
            }
        });
        
        return () => unsubscribe();
    }, [navigate]);

    useEffect(() => {
        if (ownerId) {
            fetchOwnerData();
        }
    }, [ownerId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
            <header className='w-full fixed top-0 left-0 shadow-xl bg-white/90 backdrop-blur-md border-b border-gray-200 z-10'>
                <div className='max-w-screen-xl mx-auto p-4'>
                    <div className="flex items-center justify-between">
                        <div className="w-20"></div>
                        <h1 className='text-4xl text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text font-bold'>
                            Range Owner Profile
                        </h1>
                        <div className="flex items-center">
                            <button 
                                onClick={handleGoBack}
                                className="text-blue-600 hover:text-blue-800 font-semibold px-6 py-2 rounded-lg border border-blue-200 hover:bg-blue-50 transition-all duration-200"
                            >
                                ← Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </header>
                     
            <main className="pt-24 pb-8">
                <div className="max-w-screen-xl mx-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center min-h-96">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                            <span className="ml-3 text-gray-600">Loading profile...</span>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Owner Information Card */}
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Profile Information</h2>
                                    <p className="text-gray-600">Manage your business profile and contact details</p>
                                </div>

                                {/* Logo Upload Section */}
                                <div className="flex flex-col items-center mb-10">
                                    <div className="relative mb-4">
                                        <div
                                            className={`relative w-40 h-40 rounded-full overflow-hidden border-4 border-gradient-to-r from-blue-400 to-indigo-500 shadow-2xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-3xl ${
                                                isUploading ? 'animate-pulse' : ''
                                            }`}
                                            onClick={triggerFileInput}
                                            onDragOver={handleDragOver}
                                            onDrop={handleDrop}
                                            style={{
                                                background: logoUrl ? 'transparent' : 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)'
                                            }}
                                        >
                                            {logoUrl ? (
                                                <img
                                                    src={logoUrl}
                                                    alt="Business Logo"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-white text-lg font-semibold">
                                                    Upload Logo
                                                </div>
                                            )}
                                            
                                            {/* Overlay for better UX */}
                                            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                                                <Camera className="w-8 h-8 text-white" />
                                            </div>
                                        </div>
                                        
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                triggerFileInput();
                                            }}
                                            className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-full border-4 border-white shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
                                        >
                                            <Camera className="w-5 h-5 text-white" />
                                        </button>
                                    </div>
                                    
                                    <p className="text-gray-500 text-sm text-center max-w-xs">
                                        Click to upload your business logo. Recommended: Square image, min 200x200px
                                    </p>
                                    
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleLogoUpload}
                                        className="hidden"
                                    />
                                </div>

                                {/* Form Fields */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Owner Name */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Owner Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={ownerData.name}
                                            onChange={(e) => handleInputChange('name', e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-500"
                                            placeholder="Enter your full name"
                                        />
                                    </div>

                                    {/* Phone Number */}
                                    <div className="space-y-2">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="tel"
                                            value={ownerData.phone}
                                            onChange={(e) => handleInputChange('phone', e.target.value)}
                                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-500"
                                            placeholder="Enter your phone number"
                                        />
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="mt-8 space-y-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Business Description
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={ownerData.description}
                                        onChange={(e) => handleInputChange('description', e.target.value)}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-gray-800 placeholder-gray-500 resize-none"
                                        placeholder="Describe your shooting range business..."
                                    />
                                </div>
                                
                                {/* Save Profile Button */}
                                <div className="flex justify-center mt-10">
                                    <button 
                                        onClick={handleSaveProfile}
                                        disabled={isSaving}
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold px-12 py-4 rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isSaving ? (
                                            <>
                                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                                Saving...
                                            </>
                                        ) : (
                                            'Save Profile'
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Ranges Carousel */}
                            <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/50 p-8">
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Your Shooting Ranges</h2>
                                    <p className="text-gray-600">Manage and view all your registered shooting ranges</p>
                                </div>
                                
                                {ranges.length > 0 ? (
                                    <div className="relative max-w-5xl mx-auto">
                                        {/* Carousel Container */}
                                        <div className="overflow-hidden rounded-2xl">
                                            <div 
                                                className="flex transition-transform duration-500 ease-in-out"
                                                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
                                            >
                                                {ranges.map((range) => (
                                                    <div key={range.id} className="w-full flex-shrink-0 px-4">
                                                        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300">
                                                            {range.image && (
                                                                <div className="relative overflow-hidden rounded-xl mb-6">
                                                                    <img
                                                                        src={range.image}
                                                                        alt={range.name}
                                                                        className="w-full h-72 object-cover transform hover:scale-105 transition-transform duration-300"
                                                                    />
                                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                                                </div>
                                                            )}
                                                            <div className="space-y-4">
                                                                <h3 className="text-2xl font-bold text-gray-800">{range.name || 'Unnamed Range'}</h3>
                                                                
                                                                <div className="space-y-2">
                                                                    {range.location && (
                                                                        <div className="flex items-center text-gray-600">
                                                                            <span className="text-blue-500 mr-2">📍</span>
                                                                            <span>{range.location}</span>
                                                                        </div>
                                                                    )}
                                                                    {range.lanes && (
                                                                        <div className="flex items-center text-gray-600">
                                                                            <span className="text-blue-500 mr-2">🎯</span>
                                                                            <span>{range.lanes} Lanes Available</span>
                                                                        </div>
                                                                    )}
                                                                    {range.phone && (
                                                                        <div className="flex items-center text-gray-600">
                                                                            <span className="text-blue-500 mr-2">📞</span>
                                                                            <span>{range.phone}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                
                                                                {range.description && (
                                                                    <p className="text-gray-600 bg-gray-50 p-3 rounded-lg text-sm leading-relaxed">
                                                                        {range.description}
                                                                    </p>
                                                                )}
                                                                
                                                                <div className="flex gap-2 pt-2">
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                                        Active
                                                                    </span>
                                                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                        Verified
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Navigation Buttons */}
                                        {ranges.length > 1 && (
                                            <>
                                                <button
                                                    onClick={prevSlide}
                                                    className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm border border-gray-200"
                                                >
                                                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                                                </button>
                                                
                                                <button
                                                    onClick={nextSlide}
                                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all duration-200 backdrop-blur-sm border border-gray-200"
                                                >
                                                    <ChevronRight className="w-6 h-6 text-gray-700" />
                                                </button>

                                                {/* Dots Indicator */}
                                                <div className="flex justify-center space-x-3 mt-8">
                                                    {ranges.map((_, index) => (
                                                        <button
                                                            key={index}
                                                            onClick={() => setCurrentSlide(index)}
                                                            className={`w-3 h-3 rounded-full transition-all duration-200 ${
                                                                index === currentSlide 
                                                                    ? 'bg-blue-600 scale-125' 
                                                                    : 'bg-gray-300 hover:bg-gray-400'
                                                            }`}
                                                        />
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <div className="text-gray-300 mb-6">
                                            <svg className="w-32 h-32 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h4M9 7h6m-6 4h6m-6 4h6"/>
                                            </svg>
                                        </div>
                                        <h3 className="text-2xl font-semibold text-gray-600 mb-3">No Ranges Found</h3>
                                        <p className="text-gray-500 max-w-md mx-auto mb-6 leading-relaxed">
                                            You haven't added any shooting ranges yet. Contact our support team to add your first range to the platform and start managing your business.
                                        </p>
                                        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-colors duration-200">
                                            Contact Support
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
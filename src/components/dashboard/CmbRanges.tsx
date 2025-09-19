import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Clock, 
  DollarSign, 
  Users, 
  Star, 
  Eye,
  ArrowLeft,
  Target,
  Image as ImageIcon,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getFirestore, collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { useNavigate } from 'react-router';
import {db} from '@/firebase/config';


// TypeScript interfaces
interface OpeningHours {
  [key: string]: {
    start: string;
    end: string;
  };
}

interface SubscriptionPlan {
  duration: string;
  enabled: boolean;
  months: number;
  price: number;
}

interface SubscriptionSettings {
  createdAt: any;
  description: string;
  features: string[];
  isActive: boolean;
  ownerId: string;
  plans: SubscriptionPlan[];
  rangeId: string;
  title: string;
  updatedAt: any;
}

interface Range {
  id: string;
  name: string;
  address: string;
  contactNumber: string;
  description: string;
  facilities: string;
  latitude: number;
  longitude: number;
  maxBookingsPerSlot: number;
  ownerEmail: string;
  ownerId: string;
  ownerPremium: boolean;
  pricePerHour: number;
  rangeImages: string[];
  status: 'active' | 'inactive' | 'pending';
  structuredOpeningHours: OpeningHours;
  logoUrl?: string;
  videoUrl?: string;
  youtubeUrl?: string;
  createdAt: any;
  updatedAt: any;
  qrCodeId?: string;
  qrCodeUrl?: string;
  subscriptionSettings?: SubscriptionSettings;
}

interface FilterState {
  status: string;
  ownerPremium: string;
  priceRange: {
    min: number;
    max: number;
  };
}

const CmbRanges: React.FC = () => {
  const navigate = useNavigate();
  const [ranges, setRanges] = useState<Range[]>([]);
  const [filteredRanges, setFilteredRanges] = useState<Range[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState<Range | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState<number>(0);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    ownerPremium: 'all',
    priceRange: {
      min: 0,
      max: 10000
    }
  });

  // Fetch ranges data
  const fetchRanges = async (): Promise<void> => {
    try {
      setLoading(true);
      const rangesQuery = query(
        collection(db, 'ranges'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(rangesQuery);
      const rangesData: Range[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Range));

      setRanges(rangesData);
      setFilteredRanges(rangesData);
    } catch (error) {
      console.error('Error fetching ranges:', error);
      setError('Failed to load ranges data');
    } finally {
      setLoading(false);
    }
  };

  // Filter and search functionality
  useEffect(() => {
    let filtered = ranges;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(range =>
        range.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        range.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        range.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        range.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(range => range.status === filters.status);
    }

    // Premium filter
    if (filters.ownerPremium !== 'all') {
      filtered = filtered.filter(range => 
        range.ownerPremium === (filters.ownerPremium === 'premium')
      );
    }

    // Price range filter
    filtered = filtered.filter(range => 
      range.pricePerHour >= filters.priceRange.min && 
      range.pricePerHour <= filters.priceRange.max
    );

    setFilteredRanges(filtered);
  }, [ranges, searchTerm, filters]);

  useEffect(() => {
    fetchRanges();
  }, []);

  // Format date
  const formatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Format opening hours
  const formatOpeningHours = (hours: OpeningHours): string => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const openDays = days.filter(day => {
      const dayHours = hours[day];
      return dayHours && dayHours.start && dayHours.end;
    });

    if (openDays.length === 0) return 'Hours not specified';
    
    return openDays.map(day => {
      const dayHours = hours[day];
      return `${day}: ${dayHours.start} - ${dayHours.end}`;
    }).join(', ');
  };

  // Handle view details
  const handleViewDetails = (range: Range): void => {
    setSelectedRange(range);
    setShowDetailModal(true);
  };

  // Handle view images
  const handleViewImages = (images: string[]): void => {
    setSelectedImages(images);
    setCurrentImageIndex(0);
    setShowImageModal(true);
  };

  // Reset filters
  const resetFilters = (): void => {
    setFilters({
      status: 'all',
      ownerPremium: 'all',
      priceRange: {
        min: 0,
        max: 10000
      }
    });
    setSearchTerm('');
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md">
          <div className="text-red-600 text-center">
            <h2 className="text-xl font-semibold mb-2">Error Loading Ranges</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={fetchRanges}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard/cmb')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Shooting Ranges</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search ranges by name, address, owner email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  showFilters ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.status}
                    onChange={(e) => setFilters({...filters, status: e.target.value})}
                  >
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                {/* Premium Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Owner Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={filters.ownerPremium}
                    onChange={(e) => setFilters({...filters, ownerPremium: e.target.value})}
                  >
                    <option value="all">All Owners</option>
                    <option value="premium">Premium</option>
                    <option value="regular">Regular</option>
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price Range (₹{filters.priceRange.min} - ₹{filters.priceRange.max})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="range"
                      min="0"
                      max="10000"
                      step="100"
                      className="flex-1"
                      value={filters.priceRange.max}
                      onChange={(e) => setFilters({
                        ...filters,
                        priceRange: {...filters.priceRange, max: parseInt(e.target.value)}
                      })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-6 text-gray-600">
          Showing {filteredRanges.length} of {ranges.length} ranges
        </div>

        {/* Ranges Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : filteredRanges.length === 0 ? (
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No ranges found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRanges.map((range) => (
              <div key={range.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                {/* Range Image */}
                <div className="relative h-48 bg-gray-200">
                  {range.logoUrl ? (
                    <img
                      src={range.logoUrl}
                      alt={range.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/400x200?text=No+Image';
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Target className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-medium ${
                    range.status === 'active' ? 'bg-green-100 text-green-800' :
                    range.status === 'inactive' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {range.status.charAt(0).toUpperCase() + range.status.slice(1)}
                  </div>

                  {/* Premium Badge */}
                  {range.ownerPremium && (
                    <div className="absolute top-2 left-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                      <Star className="h-3 w-3" />
                      Premium
                    </div>
                  )}
                </div>

                {/* Range Details */}
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{range.name}</h3>
                    <div className="text-lg font-bold text-green-600">₹{range.pricePerHour}/hr</div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span className="truncate">{range.address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4" />
                      <span>{range.contactNumber}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Users className="h-4 w-4" />
                      <span>Max {range.maxBookingsPerSlot} bookings/slot</span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{range.description}</p>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewDetails(range)}
                      className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                    {range.rangeImages.length > 0 && (
                      <button
                        onClick={() => handleViewImages(range.rangeImages)}
                        className="flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-2 rounded-lg transition-colors"
                      >
                        <ImageIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedRange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-semibold">{selectedRange.name}</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Basic Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Name:</strong> {selectedRange.name}</div>
                      <div><strong>Address:</strong> {selectedRange.address}</div>
                      <div><strong>Contact:</strong> {selectedRange.contactNumber}</div>
                      <div><strong>Owner Email:</strong> {selectedRange.ownerEmail}</div>
                      <div><strong>Status:</strong> 
                        <span className={`ml-2 px-2 py-1 rounded text-xs ${
                          selectedRange.status === 'active' ? 'bg-green-100 text-green-800' :
                          selectedRange.status === 'inactive' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedRange.status.charAt(0).toUpperCase() + selectedRange.status.slice(1)}
                        </span>
                      </div>
                      <div><strong>Owner Type:</strong> {selectedRange.ownerPremium ? 'Premium' : 'Regular'}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Pricing & Capacity</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Price per Hour:</strong> ₹{selectedRange.pricePerHour}</div>
                      <div><strong>Max Bookings per Slot:</strong> {selectedRange.maxBookingsPerSlot}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Location</h3>
                    <div className="space-y-2 text-sm">
                      <div><strong>Latitude:</strong> {selectedRange.latitude}</div>
                      <div><strong>Longitude:</strong> {selectedRange.longitude}</div>
                    </div>
                  </div>

                  {selectedRange.qrCodeUrl && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">QR Code</h3>
                      <div className="text-sm">
                        <img 
                          src={selectedRange.qrCodeUrl} 
                          alt="QR Code" 
                          className="w-32 h-32 object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Description</h3>
                    <p className="text-sm text-gray-600">{selectedRange.description}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Facilities</h3>
                    <p className="text-sm text-gray-600">{selectedRange.facilities}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Opening Hours</h3>
                    <div className="text-sm text-gray-600">
                      {formatOpeningHours(selectedRange.structuredOpeningHours)}
                    </div>
                  </div>

                  {selectedRange.videoUrl && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Video</h3>
                      <div className="text-sm">
                        <video controls className="w-full max-h-48 rounded-lg">
                          <source src={selectedRange.videoUrl} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                      </div>
                    </div>
                  )}

                  {selectedRange.subscriptionSettings && (
                    <div>
                      <h3 className="font-semibold text-lg mb-2">Subscription Plans</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Title:</strong> {selectedRange.subscriptionSettings.title}</div>
                        <div><strong>Description:</strong> {selectedRange.subscriptionSettings.description}</div>
                        <div><strong>Features:</strong> {selectedRange.subscriptionSettings.features.join(', ')}</div>
                        <div><strong>Active:</strong> {selectedRange.subscriptionSettings.isActive ? 'Yes' : 'No'}</div>
                        
                        <div className="mt-2">
                          <strong>Plans:</strong>
                          {selectedRange.subscriptionSettings.plans
                            .filter(plan => plan.enabled)
                            .map((plan, index) => (
                              <div key={index} className="ml-4 mt-1">
                                {plan.duration}: ₹{plan.price}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold text-lg mb-2">Timestamps</h3>
                    <div className="space-y-1 text-sm">
                      <div><strong>Created:</strong> {formatDate(selectedRange.createdAt)}</div>
                      <div><strong>Updated:</strong> {formatDate(selectedRange.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Images Section */}
              {selectedRange.rangeImages.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-lg mb-2">Range Images ({selectedRange.rangeImages.length})</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {selectedRange.rangeImages.slice(0, 6).map((image, index) => (
                      <img
                        key={index}
                        src={image}
                        alt={`Range ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => handleViewImages(selectedRange.rangeImages)}
                      />
                    ))}
                    {selectedRange.rangeImages.length > 6 && (
                      <div 
                        className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors"
                        onClick={() => handleViewImages(selectedRange.rangeImages)}
                      >
                        <span className="text-sm text-gray-600">+{selectedRange.rangeImages.length - 6} more</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Modal */}
      {showImageModal && selectedImages.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>
            
            <div className="relative">
              <img
                src={selectedImages[currentImageIndex]}
                alt={`Range image ${currentImageIndex + 1}`}
                className="w-full max-h-[80vh] object-contain"
              />
              
              {selectedImages.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 bg-black bg-opacity-50 px-4 py-2 rounded-full">
                  {selectedImages.map((_, index) => (
                    <button
                      key={index}
                      className={`w-3 h-3 rounded-full ${
                        index === currentImageIndex ? 'bg-white' : 'bg-gray-400'
                      }`}
                      onClick={() => setCurrentImageIndex(index)}
                    />
                  ))}
                </div>
              )}
            </div>
            
            <div className="text-center mt-4 text-white">
              {currentImageIndex + 1} of {selectedImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CmbRanges;
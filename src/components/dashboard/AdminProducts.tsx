import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, Check, X, Clock, Eye } from 'lucide-react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Adjust the import path as needed

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [rangeOwners, setRangeOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
    ownerId: 'all',
    priceRange: { min: '', max: '' },
    dateRange: { start: '', end: '' }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch products
        const productsCollection = collection(db, 'products');
        const productsSnapshot = await getDocs(productsCollection);
        const productsData = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          // Convert Firestore timestamps to JavaScript Date objects
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        }));
        setProducts(productsData);
        
        // Fetch range owners
        const ownersCollection = collection(db, 'range-owners');
        const ownersSnapshot = await getDocs(ownersCollection);
        const ownersData = ownersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        }));
        setRangeOwners(ownersData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter products based on current filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
                         product.description.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || product.status === filters.status;
    
    const matchesCategory = filters.category === 'all' || product.category === filters.category;
    
    const matchesOwner = filters.ownerId === 'all' || product.ownerId === filters.ownerId;
    
    const matchesPriceRange = (!filters.priceRange.min || product.price >= parseFloat(filters.priceRange.min)) &&
                             (!filters.priceRange.max || product.price <= parseFloat(filters.priceRange.max));
    
    const productDate = new Date(product.createdAt);
    const matchesDateRange = (!filters.dateRange.start || productDate >= new Date(filters.dateRange.start)) &&
                            (!filters.dateRange.end || productDate <= new Date(filters.dateRange.end));

    return matchesSearch && matchesStatus && matchesCategory && matchesOwner && matchesPriceRange && matchesDateRange;
  });

  // Update product status in Firebase
  const updateProductStatus = async (productId, newStatus) => {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, { status: newStatus });
      
      setProducts(prev => prev.map(product => 
        product.id === productId ? { ...product, status: newStatus } : product
      ));
      
      console.log(`Product ${productId} status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  // Get owner name by ID
  const getOwnerName = (ownerId) => {
    const owner = rangeOwners.find(owner => owner.uid === ownerId);
    return owner ? owner.name : 'Unknown Owner';
  };

  // Get owner business name by ID
  const getOwnerBusiness = (ownerId) => {
    const owner = rangeOwners.find(owner => owner.uid === ownerId);
    return owner ? owner.businessName : 'Unknown Business';
  };

  // Status badge component
  const StatusBadge = ({ status }) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: Check },
      blocked: { color: 'bg-red-100 text-red-800', icon: X },
      rejected: { color: 'bg-gray-100 text-gray-800', icon: X }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
          <p className="text-gray-600 mt-2">Manage and moderate products from range owners</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="blocked">Blocked</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                >
                  <option value="all">All Categories</option>
                  <option value="shooting-range">Shooting Range</option>
                  <option value="training">Training</option>
                  <option value="equipment">Equipment</option>
                  <option value="membership">Membership</option>
                </select>
              </div>

              {/* Range Owner Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Range Owner</label>
                <select
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  value={filters.ownerId}
                  onChange={(e) => setFilters(prev => ({ ...prev, ownerId: e.target.value }))}
                >
                  <option value="all">All Owners</option>
                  {rangeOwners.map(owner => (
                    <option key={owner.uid} value={owner.uid}>
                      {owner.name} - {owner.businessName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={filters.priceRange.min}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      priceRange: { ...prev.priceRange, min: e.target.value }
                    }))}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    value={filters.priceRange.max}
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      priceRange: { ...prev.priceRange, max: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="mb-4">
          <p className="text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
              {/* Product Image */}
              <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                <img
                  src={product.images?.[0] || 'https://via.placeholder.com/400x250'}
                  alt={product.name}
                  className="w-full h-48 object-cover"
                />
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">{product.name}</h3>
                  <StatusBadge status={product.status} />
                </div>

                <p className="text-gray-600 text-sm mb-2 line-clamp-2">{product.description}</p>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="font-medium">Owner:</span> {getOwnerName(product.ownerId)}
                  </div>
                  <div>
                    <span className="font-medium">Business:</span> {getOwnerBusiness(product.ownerId)}
                  </div>
                  <div>
                    <span className="font-medium">Price:</span> ${product.price.toFixed(2)}
                  </div>
                  <div>
                    <span className="font-medium">Category:</span> {product.category.replace('-', ' ')}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  
                  {product.status !== 'approved' && (
                    <button
                      onClick={() => updateProductStatus(product.id, 'approved')}
                      className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Approve
                    </button>
                  )}
                  
                  {product.status !== 'blocked' && (
                    <button
                      onClick={() => updateProductStatus(product.id, 'blocked')}
                      className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      Block
                    </button>
                  )}
                  
                  {product.status !== 'rejected' && (
                    <button
                      onClick={() => updateProductStatus(product.id, 'rejected')}
                      className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* No Results */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Search className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try adjusting your search terms or filters</p>
          </div>
        )}

        {/* Product Detail Modal */}
        {selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProduct.name}</h2>
                  <button
                    onClick={() => setSelectedProduct(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="space-y-4">
                  <img
                    src={selectedProduct.images?.[0] || 'https://via.placeholder.com/600x300'}
                    alt={selectedProduct.name}
                    className="w-full h-64 object-cover rounded-lg"
                  />

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <div className="mt-1">
                        <StatusBadge status={selectedProduct.status} />
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Price:</span>
                      <p className="text-lg font-semibold text-green-600">${selectedProduct.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Category:</span>
                      <p className="capitalize">{selectedProduct.category.replace('-', ' ')}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <p>{new Date(selectedProduct.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium text-gray-700">Owner:</span>
                      <p>{getOwnerName(selectedProduct.ownerId)} - {getOwnerBusiness(selectedProduct.ownerId)}</p>
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700">Description:</span>
                    <p className="mt-1 text-gray-600">{selectedProduct.description}</p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t">
                    {selectedProduct.status !== 'approved' && (
                      <button
                        onClick={() => {
                          updateProductStatus(selectedProduct.id, 'approved');
                          setSelectedProduct(null);
                        }}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                      >
                        <Check className="w-4 h-4" />
                        Approve Product
                      </button>
                    )}
                    
                    {selectedProduct.status !== 'blocked' && (
                      <button
                        onClick={() => {
                          updateProductStatus(selectedProduct.id, 'blocked');
                          setSelectedProduct(null);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Block Product
                      </button>
                    )}
                    
                    {selectedProduct.status !== 'rejected' && (
                      <button
                        onClick={() => {
                          updateProductStatus(selectedProduct.id, 'rejected');
                          setSelectedProduct(null);
                        }}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Reject Product
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
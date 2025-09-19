import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, Check, X, Clock, Eye, Plus, Edit, Trash2, Grid, List, Upload, Image as ImageIcon } from 'lucide-react';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  addDoc, 
  deleteDoc,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../../firebase/config';
import { useAuth } from '@/firebase/auth';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  ownerId: string;
  status: 'pending' | 'active' | 'blocked';
  createdAt: Date;
  updatedAt: Date;
  isPremium?: boolean;
  adminApproved?: boolean;
}

interface RangeOwner {
  uid: string;
  name: string;
  businessName: string;
}

interface AdminUser {
  uid: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: Date;
}

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [rangeOwners, setRangeOwners] = useState<RangeOwner[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'rangeOwner' | 'admin'>('rangeOwner');
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    category: 'all',
    ownerId: 'all',
    priceRange: { min: '', max: '' },
    dateRange: { start: '', end: '' }
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '' as string | number,
    stock: '' as string | number,
    category: '',
    images: [] as string[]
  });
  const [uploadingImages, setUploadingImages] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const auth = useAuth();
  const currentUserUid = auth.user?.uid;

  const categories = [
    'Firearms',
    'Ammunition',
    'Targets',
    'Safety Gear',
    'Accessories',
    'Equipment',
    'Maintenance',
    'Training',
    'Other'
  ];

  // Fetch data from Firebase
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch products
        const productsQuery = query(
          collection(db, 'products'),
          orderBy('createdAt', 'desc')
        );
        const productsSnapshot = await getDocs(productsQuery);
        const productsData: Product[] = productsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Product));
        setProducts(productsData);
        
        // Fetch range owners
        const ownersCollection = collection(db, 'range-owners');
        const ownersSnapshot = await getDocs(ownersCollection);
        const ownersData: RangeOwner[] = ownersSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as RangeOwner));
        setRangeOwners(ownersData);

        // Fetch admins
        const adminsCollection = collection(db, 'admins');
        const adminsSnapshot = await getDocs(adminsCollection);
        const adminsData: AdminUser[] = adminsSnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        } as AdminUser));
        setAdmins(adminsData);
        
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter products based on current filters and active tab
  const filteredProducts = products.filter(product => {
    // Tab-based filtering
    const isAdminProduct = product.adminApproved;
    if (activeTab === 'admin' && !isAdminProduct) return false;
    if (activeTab === 'rangeOwner' && isAdminProduct) return false;
    
    // Other filters
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
  const updateProductStatus = async (productId: string, newStatus: 'active' | 'blocked') => {
    try {
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, { 
        status: newStatus,
        statusUpdatedAt: new Date()
      });
      
      setProducts(prev => prev.map(product => 
        product.id === productId ? { ...product, status: newStatus } : product
      ));
    } catch (error) {
      console.error('Error updating product status:', error);
    }
  };

  // Delete product
  const deleteProduct = async (productId: string) => {
    try {
      // First, delete any associated images from storage
      const product = products.find(p => p.id === productId);
      if (product && product.images && product.images.length > 0) {
        for (const imageUrl of product.images) {
          try {
            // Extract the path from the URL or use a consistent path pattern
            const imageRef = ref(storage, imageUrl);
            await deleteObject(imageRef);
          } catch (error) {
            console.error('Error deleting image:', error);
          }
        }
      }
      
      // Then delete the product document
      await deleteDoc(doc(db, 'products', productId));
      setProducts(prev => prev.filter(product => product.id !== productId));
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  // Upload images to Firebase Storage
  const uploadImages = async (files: FileList): Promise<string[]> => {
    const uploadPromises = [];
    const uploadedUrls = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `products/${Date.now()}_${file.name}`);
      uploadPromises.push(
        uploadBytes(storageRef, file)
          .then(snapshot => getDownloadURL(snapshot.ref))
          .then(url => {
            uploadedUrls.push(url);
            return url;
          })
      );
    }
    
    return Promise.all(uploadPromises).then(() => uploadedUrls);
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    try {
      setUploadingImages(true);
      const uploadedUrls = await uploadImages(e.target.files);
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  // Remove image from form data
  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  // Create or update admin product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get the current admin's UID from auth
      const adminUid = currentUserUid;
      
      if (!adminUid) {
        console.error('No admin user found');
        return;
      }
      
      const productData = {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        stock: Number(formData.stock),
        category: formData.category,
        images: formData.images,
        ownerId: adminUid,
        isPremium: true,
        adminApproved: true,
        status: 'active' as const,
        updatedAt: new Date()
      };

      if (editingProduct && editingProduct.id) {
        // Update existing product
        const productRef = doc(db, 'products', editingProduct.id);
        await updateDoc(productRef, productData);
        
        setProducts(prev => prev.map(product => 
          product.id === editingProduct.id ? { ...product, ...productData } : product
        ));
      } else {
        // Create new admin product
        const newProductData = {
          ...productData,
          createdAt: new Date()
        };
        
        const docRef = await addDoc(collection(db, 'products'), newProductData);
        setProducts(prev => [...prev, { id: docRef.id, ...newProductData }]);
      }
      
      setShowProductModal(false);
      setEditingProduct(null);
      setFormData({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '',
        images: []
      });
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  // Get owner name by ID
  const getOwnerName = (ownerId: string) => {
    const admin = admins.find(admin => admin.uid === ownerId);
    if (admin) return admin.fullName;
    
    const owner = rangeOwners.find(owner => owner.uid === ownerId);
    return owner ? owner.name : 'Unknown Owner';
  };

  // Get owner business name by ID
  const getOwnerBusiness = (ownerId: string) => {
    const admin = admins.find(admin => admin.uid === ownerId);
    if (admin) return 'Global Shooting League';
    
    const owner = rangeOwners.find(owner => owner.uid === ownerId);
    return owner ? owner.businessName : 'Unknown Business';
  };

  // Check if owner is admin
  const isAdminOwner = (ownerId: string) => {
    return admins.some(admin => admin.uid === ownerId);
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: 'pending' | 'active' | 'blocked' }) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      active: { color: 'bg-green-100 text-green-800', icon: Check },
      blocked: { color: 'bg-red-100 text-red-800', icon: X }
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

  // Admin badge component
  const AdminBadge = () => (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
      Admin Product
    </span>
  );

  // Open edit modal for admin product
  const handleEditAdminProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      images: product.images || []
    });
    setShowProductModal(true);
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600 mt-1 md:mt-2">Manage and moderate products from range owners</p>
          </div>
          
          {activeTab === 'admin' && (
            <button
              onClick={() => setShowProductModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 w-full md:w-auto justify-center"
            >
              <Plus className="w-4 h-4" />
              Add Admin Product
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              className={`py-2 px-4 font-medium text-sm md:text-base ${activeTab === 'rangeOwner' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('rangeOwner')}
            >
              Range Owner Products
            </button>
            <button
              className={`py-2 px-4 font-medium text-sm md:text-base ${activeTab === 'admin' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('admin')}
            >
              Admin Products
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6 mb-6">
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
            
            {/* View Toggle */}
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-500'}`}
                >
                  <List className="w-4 h-4" />
                </button>
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
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
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
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Range Owner Filter - Only show for range owner products tab */}
              {activeTab === 'rangeOwner' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
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
              )}

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
        <div className="mb-4 flex justify-between items-center">
          <p className="text-gray-600">
            Showing {filteredProducts.length} of {products.length} products
          </p>
          
          {activeTab === 'admin' && (
            <button
              onClick={() => setShowProductModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 md:hidden"
            >
              <Plus className="w-4 h-4" />
              Add Admin Product
            </button>
          )}
        </div>

        {/* Products Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={product.status} />
                      {product.adminApproved && <AdminBadge />}
                    </div>
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
                      <span className="font-medium">Price:</span> ₹{product.price.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Category:</span> {product.category}
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
                    
                    {product.adminApproved ? (
                      // Admin product actions - Admin can edit/delete
                      <>
                        <button
                          onClick={() => handleEditAdminProduct(product)}
                          className="px-3 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                        <button
                          onClick={() => product.id && deleteProduct(product.id)}
                          className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    ) : (
                      // Range owner product actions - Admin can manage all
                      <>
                        {product.status === 'pending' && (
                          <>
                            <button
                              onClick={() => product.id && updateProductStatus(product.id, 'active')}
                              className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Approve
                            </button>
                            <button
                              onClick={() => product.id && deleteProduct(product.id)}
                              className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
                            >
                              <X className="w-4 h-4" />
                              Reject
                            </button>
                          </>
                        )}
                        
                        {product.status === 'active' && (
                          <>
                            <button
                              onClick={() => product.id && updateProductStatus(product.id, 'blocked')}
                              className="px-3 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1"
                            >
                              <X className="w-4 h-4" />
                              Block
                            </button>
                            <button
                              onClick={() => product.id && deleteProduct(product.id)}
                              className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </>
                        )}
                        
                        {product.status === 'blocked' && (
                          <>
                            <button
                              onClick={() => product.id && updateProductStatus(product.id, 'active')}
                              className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1"
                            >
                              <Check className="w-4 h-4" />
                              Activate
                            </button>
                            <button
                              onClick={() => product.id && deleteProduct(product.id)}
                              className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // List View
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.map(product => (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          <img className="h-10 w-10 rounded-md object-cover" src={product.images?.[0] || 'https://via.placeholder.com/40'} alt={product.name} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{product.name}</div>
                          <div className="text-sm text-gray-500 line-clamp-1">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={product.status} />
                      {product.adminApproved && <div className="mt-1"><AdminBadge /></div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{product.price.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{getOwnerName(product.ownerId)}</div>
                      <div className="text-xs text-gray-400">{getOwnerBusiness(product.ownerId)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setSelectedProduct(product)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View
                        </button>
                        
                        {product.adminApproved ? (
                          // Admin product actions - Admin can edit/delete
                          <>
                            <button
                              onClick={() => handleEditAdminProduct(product)}
                              className="text-yellow-600 hover:text-yellow-900"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => product.id && deleteProduct(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          // Range owner product actions - Admin can manage all
                          <>
                            {product.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => product.id && updateProductStatus(product.id, 'active')}
                                  className="text-green-600 hover:text-green-900"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => product.id && deleteProduct(product.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            
                            {(product.status === 'active' || product.status === 'blocked') && (
                              <>
                                <button
                                  onClick={() => product.id && updateProductStatus(
                                    product.id, 
                                    product.status === 'active' ? 'blocked' : 'active'
                                  )}
                                  className={product.status === 'active' ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}
                                >
                                  {product.status === 'active' ? 'Block' : 'Activate'}
                                </button>
                                <button
                                  onClick={() => product.id && deleteProduct(product.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
                        {selectedProduct.adminApproved && <div className="mt-1"><AdminBadge /></div>}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Price:</span>
                      <p className="text-lg font-semibold text-green-600">₹{selectedProduct.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Stock:</span>
                      <p>{selectedProduct.stock}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Category:</span>
                      <p>{selectedProduct.category}</p>
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

                  {!selectedProduct.adminApproved && (
                    <div className="flex gap-3 pt-4 border-t">
                      {selectedProduct.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              if (selectedProduct.id) {
                                updateProductStatus(selectedProduct.id, 'active');
                              }
                              setSelectedProduct(null);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Approve Product
                          </button>
                          <button
                            onClick={() => {
                              if (selectedProduct.id) {
                                deleteProduct(selectedProduct.id);
                              }
                              setSelectedProduct(null);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Reject Product
                          </button>
                        </>
                      )}
                      
                      {selectedProduct.status === 'active' && (
                        <>
                          <button
                            onClick={() => {
                              if (selectedProduct.id) {
                                updateProductStatus(selectedProduct.id, 'blocked');
                              }
                              setSelectedProduct(null);
                            }}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                          >
                            <X className="w-4 h-4" />
                            Block Product
                          </button>
                          <button
                            onClick={() => {
                              if (selectedProduct.id) {
                                deleteProduct(selectedProduct.id);
                              }
                              setSelectedProduct(null);
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Product
                          </button>
                        </>
                      )}
                      
                      {selectedProduct.status === 'blocked' && (
                        <>
                          <button
                            onClick={() => {
                              if (selectedProduct.id) {
                                updateProductStatus(selectedProduct.id, 'active');
                              }
                              setSelectedProduct(null);
                            }}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                          >
                            <Check className="w-4 h-4" />
                            Activate Product
                          </button>
                          <button
                            onClick={() => {
                              if (selectedProduct.id) {
                                deleteProduct(selectedProduct.id);
                              }
                              setSelectedProduct(null);
                            }}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Product
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Admin Product Modal */}
        {showProductModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingProduct ? 'Edit Admin Product' : 'Add Admin Product'}
                  </h2>
                  <button
                    onClick={() => {
                      setShowProductModal(false);
                      setEditingProduct(null);
                      setFormData({
                        name: '',
                        description: '',
                        price: '',
                        stock: '',
                        category: '',
                        images: []
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleSaveProduct} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter product name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe your product"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Price (₹) *</label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter price"
                        min="1"
                        step="0.01"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity *</label>
                      <input
                        type="number"
                        value={formData.stock}
                        onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter stock quantity"
                        min="1"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select a category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  {/* Image Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Images</label>
                    
                    {/* Image Upload Input */}
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-8 h-8 mb-3 text-gray-400" />
                        <p className="mb-2 text-sm text-gray-500">
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploadingImages}
                      />
                    </label>
                    
                    {/* Uploading Indicator */}
                    {uploadingImages && (
                      <div className="mt-2 text-sm text-blue-600 flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        Uploading images...
                      </div>
                    )}
                    
                    {/* Image Preview */}
                    {formData.images.length > 0 && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Images:</p>
                        <div className="grid grid-cols-3 gap-2">
                          {formData.images.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Product preview ${index + 1}`}
                                className="h-20 w-full object-cover rounded-md"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductModal(false);
                        setEditingProduct(null);
                        setFormData({
                          name: '',
                          description: '',
                          price: '',
                          stock: '',
                          category: '',
                          images: []
                        });
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                    >
                      {editingProduct ? 'Update Product' : 'Create Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminProducts;
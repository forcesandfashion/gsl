import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Upload, 
  X, 
  Save, 
  Package, 
  DollarSign, 
  Hash,
  FileText,
  Image as ImageIcon,
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Crown,
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp 
} from 'firebase/firestore';
import { useAuth } from '@/firebase/auth';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import { db, storage } from '@/firebase/config';

type ProductStatus = 'pending' | 'active' | 'blocked';

interface Product {
  id?: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  images: string[];
  ownerId: string;
  status: ProductStatus;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  isPremium?: boolean;
}

interface ProductFormData {
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  imageFiles: File[];
  existingImages: string[];
}

interface RangeOwner {
  premium: boolean;
}

const RangeOwnerShop: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ProductStatus>('all');
  const [isOwnerPremium, setIsOwnerPremium] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  const auth = useAuth();
  const ownerId = auth.user?.uid;

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    category: '',
    imageFiles: [],
    existingImages: []
  });

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

  const statusConfig = {
    pending: {
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      label: 'Pending Review',
      badgeColor: 'bg-yellow-500'
    },
    active: {
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      label: 'Active',
      badgeColor: 'bg-green-500'
    },
    blocked: {
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      label: 'Blocked',
      badgeColor: 'bg-red-500'
    }
  };

  useEffect(() => {
    if (ownerId) {
      fetchProducts();
      checkOwnerPremiumStatus();
    }
  }, [ownerId]);

  const checkOwnerPremiumStatus = async () => {
    try {
      if (!ownerId) return;
      
      const ownerDoc = await getDocs(query(
        collection(db, 'range-owners'),
        where('uid', '==', ownerId)
      ));
      
      if (!ownerDoc.empty) {
        const ownerData = ownerDoc.docs[0].data() as RangeOwner;
        setIsOwnerPremium(ownerData.premium || false);
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!ownerId) return;
      
      const q = query(
        collection(db, 'products'),
        where('ownerId', '==', ownerId),

      );
      
      const querySnapshot = await getDocs(q);
      const productsData: Product[] = [];
      
      querySnapshot.forEach((doc) => {
        const productData = doc.data();
        productsData.push({
          id: doc.id,
          ...productData,
        } as Product);
      });
      
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const fileArray = Array.from(files);
      const totalImages = formData.imageFiles.length + formData.existingImages.length + fileArray.length;
      
      if (totalImages > 5) {
        setError('Maximum 5 images allowed per product');
        return;
      }
      
      setFormData(prev => ({
        ...prev,
        imageFiles: [...prev.imageFiles, ...fileArray]
      }));
    }
  };

  const removeImageFile = (index: number) => {
    setFormData(prev => ({
      ...prev,
      imageFiles: prev.imageFiles.filter((_, i) => i !== index)
    }));
  };

  const removeExistingImage = (imageUrl: string) => {
    setFormData(prev => ({
      ...prev,
      existingImages: prev.existingImages.filter(url => url !== imageUrl)
    }));
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    const imageUrls: string[] = [];
    
    for (const file of files) {
      const fileName = `products/${ownerId}/${Date.now()}_${file.name}`;
      const storageRef = ref(storage, fileName);
      
      try {
        const snapshot = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(snapshot.ref);
        imageUrls.push(downloadURL);
      } catch (error) {
        console.error('Error uploading image:', error);
        throw new Error(`Failed to upload image: ${file.name}`);
      }
    }
    
    return imageUrls;
  };

  const deleteImageFromStorage = async (imageUrl: string) => {
    try {
      const storageRef = ref(storage, imageUrl);
      await deleteObject(storageRef);
    } catch (error) {
      console.error('Error deleting image from storage:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || formData.price <= 0) {
      setError('Please fill in all required fields with valid values');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      
      let imageUrls: string[] = [...formData.existingImages];
      
      // Upload new images
      if (formData.imageFiles.length > 0) {
        const newImageUrls = await uploadImages(formData.imageFiles);
        imageUrls = [...imageUrls, ...newImageUrls];
      }
      
      const productData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: formData.price,
        stock: formData.stock,
        category: formData.category,
        images: imageUrls,
        ownerId,
        isPremium: isOwnerPremium,
        updatedAt: Timestamp.now()
      };
      
      if (editingProduct) {
        // Update existing product - maintain current status
        await updateDoc(doc(db, 'products', editingProduct.id!), {
          ...productData,
          status: editingProduct.status // Keep the current status
        });
        
        // Delete removed images from storage
        const removedImages = editingProduct.images.filter(
          url => !formData.existingImages.includes(url)
        );
        
        for (const imageUrl of removedImages) {
          await deleteImageFromStorage(imageUrl);
        }
        
        setSuccess('Product updated successfully!');
      } else {
        // Create new product with pending status
        await addDoc(collection(db, 'products'), {
          ...productData,
          status: 'pending' as ProductStatus,
          createdAt: Timestamp.now()
        });
        
        setSuccess('Product created successfully! It will be reviewed before going live.');
      }
      
      await fetchProducts();
      setTimeout(() => handleCloseModal(), 1000);
    } catch (error) {
      console.error('Error saving product:', error);
      setError('Failed to save product. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      category: product.category,
      imageFiles: [],
      existingImages: [...product.images]
    });
    setShowModal(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    
    try {
      // Delete images from storage
      for (const imageUrl of product.images) {
        await deleteImageFromStorage(imageUrl);
      }
      
      // Delete product document
      await deleteDoc(doc(db, 'products', product.id!));
      setSuccess('Product deleted successfully!');
      await fetchProducts();
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product. Please try again.');
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      imageFiles: [],
      existingImages: []
    });
    setError(null);
    setSuccess(null);
  };

  const handleInputChange = (field: keyof ProductFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getFilteredProducts = () => {
    if (statusFilter === 'all') {
      return products;
    }
    return products.filter(product => product.status === statusFilter);
  };

  const getStatusCounts = () => {
    return {
      all: products.length,
      pending: products.filter(p => p.status === 'pending').length,
      active: products.filter(p => p.status === 'active').length,
      blocked: products.filter(p => p.status === 'blocked').length
    };
  };

  const StatusBadge: React.FC<{ status: ProductStatus }> = ({ status }) => {
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
    );
  };

  const StockIndicator: React.FC<{ stock: number }> = ({ stock }) => {
    if (stock === 0) {
      return (
        <div className="flex items-center gap-1 text-red-600 text-sm font-medium">
          <XCircle className="w-4 h-4" />
          Out of Stock
        </div>
      );
    } else if (stock <= lowStockThreshold) {
      return (
        <div className="flex items-center gap-1 text-orange-600 text-sm font-medium">
          <AlertTriangle className="w-4 h-4" />
          Low Stock
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
          <CheckCircle className="w-4 h-4" />
          In Stock
        </div>
      );
    }
  };

  const statusCounts = getStatusCounts();
  const filteredProducts = getFilteredProducts();

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Product Management</h1>
          <p className="text-gray-600">Manage your shooting range products and inventory</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Premium Badge */}
      {isOwnerPremium && (
        <div className="mb-6 bg-gradient-to-r from-yellow-100 to-amber-100 border border-yellow-300 rounded-lg p-4 flex items-center gap-3">
          <Crown className="w-6 h-6 text-yellow-600" />
          <div>
            <h3 className="font-semibold text-yellow-800">Premium Range Owner</h3>
            <p className="text-sm text-yellow-700">Your products will be featured prominently to customers</p>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-2 md:space-x-8 min-w-max">
          {[
            { key: 'all', label: 'All Products', count: statusCounts.all },
            { key: 'pending', label: 'Pending', count: statusCounts.pending },
            { key: 'active', label: 'Active', count: statusCounts.active },
            { key: 'blocked', label: 'Blocked', count: statusCounts.blocked }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key as typeof statusFilter)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                statusFilter === key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {label} ({count})
            </button>
          ))}
        </nav>
      </div>

      {/* Status Info Banner */}
      {statusFilter !== 'all' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-medium text-blue-900">Product Status Information</h3>
              <p className="text-sm text-blue-700 mt-1">
                {statusFilter === 'pending' && 'Products awaiting admin approval. They will not be visible to customers until activated.'}
                {statusFilter === 'active' && 'Products that are currently active and visible to customers.'}
                {statusFilter === 'blocked' && 'Products that have been blocked by admin and are not visible to customers.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {success}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 flex items-center gap-2">
            <XCircle className="w-4 h-4" />
            {error}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Loading products...</span>
        </div>
      ) : (
        <>
          {/* Products Grid */}
          {filteredProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Product Image */}
                  <div className="h-48 bg-gray-100 relative">
                    {product.images.length > 0 ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Package className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Premium Badge */}
                    {product.isPremium && (
                      <div className="absolute top-2 left-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        Premium
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <StatusBadge status={product.status} />
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <button
                        onClick={() => handleEdit(product)}
                        className="bg-white p-1.5 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                        title="Edit product"
                      >
                        <Edit className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="bg-white p-1.5 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 text-sm md:text-base line-clamp-2">{product.name}</h3>
                      <span className="text-lg font-bold text-green-600 whitespace-nowrap">₹{product.price}</span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                    
                    <div className="flex justify-between items-center mb-2">
                      <span className="bg-gray-100 px-2 py-1 rounded-full text-xs">{product.category}</span>
                      <StockIndicator stock={product.stock} />
                    </div>

                    {/* Status-specific messages */}
                    {product.status === 'pending' && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Awaiting admin approval
                      </div>
                    )}
                    
                    {product.status === 'blocked' && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <XCircle className="w-3 h-3 inline mr-1" />
                        Product is blocked from sale
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {statusFilter === 'all' ? 'No products yet' : `No ${statusFilter} products`}
              </h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                {statusFilter === 'all' 
                  ? 'Start by adding your first product to your shooting range shop' 
                  : `You don't have any ${statusFilter} products at the moment`}
              </p>
              {statusFilter === 'all' && (
                <button
                  onClick={() => setShowModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Your First Product
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Enter product name"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="Describe your product features and specifications"
                />
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (₹) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stock Quantity
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => handleInputChange('stock', parseInt(e.target.value) || 0)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  {formData.stock <= lowStockThreshold && formData.stock > 0 && (
                    <p className="text-xs text-orange-600 mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Low stock warning will show to customers
                    </p>
                  )}
                  {formData.stock === 0 && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      Product will show as out of stock
                    </p>
                  )}
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Images (Max 5)
                </label>
                
                {/* Existing Images */}
                {formData.existingImages.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Current images:</p>
                    <div className="flex gap-2 flex-wrap">
                      {formData.existingImages.map((imageUrl, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={imageUrl}
                            alt={`Product ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeExistingImage(imageUrl)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* New Images */}
                {formData.imageFiles.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">New images to upload:</p>
                    <div className="flex gap-2 flex-wrap">
                      {formData.imageFiles.map((file, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`New ${index + 1}`}
                            className="w-16 h-16 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeImageFile(index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                {(formData.imageFiles.length + formData.existingImages.length) < 5 && (
                  <label className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors block group">
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" />
                      <span className="text-sm text-gray-600 group-hover:text-blue-600 transition-colors">
                        Click to upload images or drag and drop
                      </span>
                      <span className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</span>
                    </div>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Status Notice for New Products */}
              {!editingProduct && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-blue-900">Review Process</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        New products will be reviewed by our team before becoming active. 
                        This usually takes 24-48 hours. You'll be notified once your product is approved.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-3  sticky bottom-0 bg-white pb-4 border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {uploading ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RangeOwnerShop;
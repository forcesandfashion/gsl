import React, { useState, useEffect } from 'react';
import { Link } from "react-router-dom";
import { ExternalLink, ArrowRight, Loader2, X, Package, CreditCard, MapPin } from 'lucide-react';
import { collection, query, where, getDocs, orderBy, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config'; // Adjust path as needed
import Layout from "./Layout";

interface Product {
  id: string;
  name: string;
  price: number;
  images: string[];
  category: string;
  description: string;
  status: string;
  stock: number;
  ownerId: string;
  createdAt?: any;
  updatedAt?: any;
}

interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface OrderForm {
  quantity: number;
  paymentMethod: string;
  customerInfo: CustomerInfo;
}

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
}

const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orderProcessing, setOrderProcessing] = useState<boolean>(false);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    quantity: 1,
    paymentMethod: 'credit-card',
    customerInfo: {
      fullName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India'
      }
    }
  });

  const paymentMethods: PaymentMethod[] = [
    { id: 'credit-card', name: 'Credit Card', icon: CreditCard },
    { id: 'paypal', name: 'PayPal', icon: ExternalLink },
    { id: 'upi', name: 'UPI', icon: CreditCard },
    { id: 'bank-transfer', name: 'Bank Transfer', icon: CreditCard }
  ];

  // Fetch approved products from Firebase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const productsRef = collection(db, 'products');
        const q = query(
          productsRef, 
          where('status', '==', 'approved'),
          
        );
        
        const querySnapshot = await getDocs(q);
        const fetchedProducts: Product[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data() as Omit<Product, 'id'>;
          fetchedProducts.push({
            id: doc.id,
            ...data
          });
        });
        
        setProducts(fetchedProducts);
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleOpenModal = (product: Product) => {
    if (product.stock <= 0) {
      alert('This product is out of stock.');
      return;
    }
    
    setSelectedProduct(product);
    setShowModal(true);
    // Reset quantity to 1 when opening modal
    setOrderForm({
      ...orderForm,
      quantity: 1
    });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setOrderProcessing(false);
    // Reset form
    setOrderForm({
      quantity: 1,
      paymentMethod: 'credit-card',
      customerInfo: {
        fullName: '',
        email: '',
        phone: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'India'
        }
      }
    });
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'customerInfo' && child in orderForm.customerInfo) {
        setOrderForm({
          ...orderForm,
          customerInfo: {
            ...orderForm.customerInfo,
            [child]: value
          }
        });
      } else if (field.startsWith('customerInfo.address.')) {
        const addressField = field.split('.')[2];
        setOrderForm({
          ...orderForm,
          customerInfo: {
            ...orderForm.customerInfo,
            address: {
              ...orderForm.customerInfo.address,
              [addressField]: value
            }
          }
        });
      }
    } else {
      setOrderForm({
        ...orderForm,
        [field]: value
      });
    }
  };

  const validateForm = (): boolean => {
    const { customerInfo } = orderForm;
    return (
      customerInfo.fullName.trim() !== '' &&
      customerInfo.email.trim() !== '' &&
      customerInfo.phone.trim() !== '' &&
      customerInfo.address.street.trim() !== '' &&
      customerInfo.address.city.trim() !== '' &&
      customerInfo.address.state.trim() !== '' &&
      customerInfo.address.zipCode.trim() !== ''
    );
  };

  const handlePlaceOrder = async () => {
    if (!validateForm() || !selectedProduct) return;
    
    // Check stock availability
    if (orderForm.quantity > selectedProduct.stock) {
      alert(`Only ${selectedProduct.stock} items available in stock.`);
      return;
    }
    
    setOrderProcessing(true);
    try {
      // Save order to Firebase
      const ordersRef = collection(db, 'orders');
      await addDoc(ordersRef, {
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        quantity: orderForm.quantity,
        total: selectedProduct.price * orderForm.quantity,
        paymentMethod: orderForm.paymentMethod,
        customerInfo: orderForm.customerInfo,
        status: 'pending',
        createdAt: new Date()
      });
      
      alert('Order placed successfully!');
      handleCloseModal();
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setOrderProcessing(false);
    }
  };

  // Get unique categories from products
  const getUniqueCategories = () => {
    const categories = products.map(product => product.category);
    return [...new Set(categories)];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black">
        <Layout>
          <main className="pt-16">
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-700" />
                <p className="text-xl text-gray-600">Loading products...</p>
              </div>
            </div>
          </main>
        </Layout>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white text-black">
        <Layout>
          <main className="pt-16">
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800 transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          </main>
        </Layout>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <Layout>
        <main className="pt-16">
          {/* Hero section */}
          <section className="py-20 bg-gradient-to-br from-blue-700 to-blue-900 text-white">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Our Products
              </h1>
              <div className="text-xl max-w-3xl mx-auto">
                <p className="mb-4">
                  Discover our curated collection of premium shooting products. Each item is carefully selected to meet the highest standards of quality and performance.
                </p>
                <p className="text-lg opacity-90">
                  {products.length} approved products available
                </p>
              </div>
            </div>
          </section>

          {/* Products Grid */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4">
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">No Products Available</h3>
                  <p className="text-gray-600">There are currently no approved products to display.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 flex flex-col h-full">
                      
                      {/* Product Image */}
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center'}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center';
                          }}
                        />
                        {product.stock <= 0 && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                              Out of Stock
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-6 flex flex-col h-full">
                        {/* Category */}
                        <div className="mb-2">
                          <span className="text-sm text-blue-600 uppercase tracking-wide font-medium">
                            {product.category}
                          </span>
                        </div>
                        
                        {/* Product Name */}
                        <h3 className="text-xl font-bold text-gray-900 mb-3">
                          {product.name}
                        </h3>

                        {/* Description */}
                        <p className="text-gray-600 text-sm mb-6 leading-relaxed flex-grow">
                          {product.description}
                        </p>

                        {/* Stock and Price */}
                        <div className="mb-6 flex justify-between items-center">
                          <div>
                            {product.stock > 0 ? (
                              <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                                In Stock: {product.stock}
                              </span>
                            ) : (
                              <span className="text-sm text-red-600 bg-red-50 px-2 py-1 rounded">
                                Out of Stock
                              </span>
                            )}
                          </div>
                          <div>
                            <span className="text-2xl font-bold text-gray-900">
                              ₹{product.price.toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {/* Buttons */}
                        <div className="mt-auto space-y-3">
                          <button
                            onClick={() => handleOpenModal(product)}
                            disabled={product.stock <= 0}
                            className={`w-full py-3 font-semibold rounded-lg transition-all duration-300 ${
                              product.stock <= 0 
                                ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                                : 'bg-blue-700 text-white hover:bg-blue-800'
                            }`}
                          >
                            {product.stock <= 0 ? 'Out of Stock' : 'Buy Now'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Product Categories - Only show if there are products */}
          {products.length > 0 && (
            <section className="py-20 bg-white">
              <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Product Categories
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Browse our extensive range of shooting products across different categories
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {getUniqueCategories().map((category, index) => {
                    const categoryCount = products.filter(product => product.category === category).length;
                    return (
                      <div key={index} className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-sm border border-blue-100 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                        <h3 className="text-lg font-semibold text-blue-700 mb-2">
                          {category}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {categoryCount} product{categoryCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Why Choose Our Products */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Why Choose Our Products
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Discover what makes our product collection stand out from the rest
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                  <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Premium Quality</h3>
                  <p className="text-gray-600">
                    All products are carefully curated and meet the highest standards of quality and craftsmanship.
                  </p>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                  <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Best Prices</h3>
                  <p className="text-gray-600">
                    Competitive pricing with regular sales and discounts to give you the best value for your money.
                  </p>
                </div>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 text-center">
                  <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Approved Products</h3>
                  <p className="text-gray-600">
                    Every product goes through a rigorous approval process to ensure quality and authenticity.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-20 bg-gradient-to-r from-blue-700 to-blue-900 text-white">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Shop?
              </h2>
              <p className="text-xl mb-8 opacity-90">
                Explore our full collection and discover products that match your shooting needs.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link to="/contact">
                  <button className="bg-white text-blue-700 hover:bg-gray-100 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg">
                    Contact Us
                  </button>
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Purchase Modal */}
        {showModal && selectedProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Complete Your Purchase</h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Product Summary */}
                <div className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                  <img
                    src={selectedProduct.images && selectedProduct.images.length > 0 ? selectedProduct.images[0] : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center'}
                    alt={selectedProduct.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center';
                    }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{selectedProduct.name}</h3>
                    <p className="text-gray-600 text-sm">{selectedProduct.category}</p>
                    <p className="text-lg font-bold text-blue-700">₹{selectedProduct.price.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">In Stock: {selectedProduct.stock}</p>
                  </div>
                </div>

                {/* Quantity Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Package className="w-4 h-4 inline mr-1" />
                    Quantity
                  </label>
                  <select
                    value={orderForm.quantity}
                    onChange={(e) => handleInputChange('quantity', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: Math.min(10, selectedProduct.stock) }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    <CreditCard className="w-4 h-4 inline mr-1" />
                    Payment Method *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          onClick={() => handleInputChange('paymentMethod', method.id)}
                          className={`p-3 border rounded-lg text-left transition-all ${
                            orderForm.paymentMethod === method.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <Icon className="w-5 h-5 mb-1" />
                          <div className="text-sm font-medium">{method.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Customer Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={orderForm.customerInfo.fullName}
                        onChange={(e) => handleInputChange('customerInfo.fullName', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Enter your full name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={orderForm.customerInfo.email}
                        onChange={(e) => handleInputChange('customerInfo.email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={orderForm.customerInfo.phone}
                      onChange={(e) => handleInputChange('customerInfo.phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    <MapPin className="w-5 h-5 inline mr-2" />
                    Shipping Address
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={orderForm.customerInfo.address.street}
                      onChange={(e) => handleInputChange('customerInfo.address.street', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="123 Main Street"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={orderForm.customerInfo.address.city}
                        onChange={(e) => handleInputChange('customerInfo.address.city', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Mumbai"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        State *
                      </label>
                      <input
                        type="text"
                        value={orderForm.customerInfo.address.state}
                        onChange={(e) => handleInputChange('customerInfo.address.state', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Maharashtra"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        value={orderForm.customerInfo.address.zipCode}
                        onChange={(e) => handleInputChange('customerInfo.address.zipCode', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="400001"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Country *
                      </label>
                      <select
                        value={orderForm.customerInfo.address.country}
                        onChange={(e) => handleInputChange('customerInfo.address.country', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="India">India</option>
                        <option value="United States">United States</option>
                        <option value="Canada">Canada</option>
                        <option value="United Kingdom">United Kingdom</option>
                        <option value="Australia">Australia</option>
                        <option value="Germany">Germany</option>
                        <option value="France">France</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Product Price:</span>
                      <span>₹{selectedProduct.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{orderForm.quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping:</span>
                      <span>Free</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total:</span>
                      <span>₹{(selectedProduct.price * orderForm.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-4 p-6 border-t border-gray-200">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePlaceOrder}
                  disabled={orderProcessing || !validateForm()}
                  className="flex-1 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {orderProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </Layout>
    </div>
  );
};

export default ShopPage;
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, increment, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Layout from './Layout';
import { ArrowLeft, Crown, CheckCircle, MapPin, DollarSign, Smartphone, CreditCard, Wallet, Loader2, X, Package } from 'lucide-react';

// Interfaces (same as in ShopPage)
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
  isPremium?: boolean;
  adminApproved?: boolean;
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
  description: string;
}

interface Bill {
  billId: string;
  billDate: Date;
  billStatus: string;
  billType: string;
  amountPaid: number;
  currency: string;
  description: string;
  paymentMethod: string;
  paymentStatus: string;
  customerInfo: CustomerInfo;
  products: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductInfoPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showModal, setShowModal] = useState<boolean>(false);
  const [orderProcessing, setOrderProcessing] = useState<boolean>(false);
  const [orderForm, setOrderForm] = useState<OrderForm>({
    quantity: 1,
    paymentMethod: 'cash',
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

  // Payment methods
  const paymentMethods: PaymentMethod[] = [
    { 
      id: 'cash', 
      name: 'Cash on Delivery', 
      icon: DollarSign, 
      description: 'Pay with cash when your order is delivered' 
    },
    { 
      id: 'upi', 
      name: 'UPI', 
      icon: Smartphone, 
      description: 'Pay using UPI apps like Google Pay, PhonePe, Paytm' 
    },
    { 
      id: 'credit-card', 
      name: 'Credit/Debit Card', 
      icon: CreditCard, 
      description: 'Pay using your credit or debit card' 
    },
    { 
      id: 'bank-transfer', 
      name: 'Bank Transfer', 
      icon: Wallet, 
      description: 'Direct bank transfer' 
    }
  ];

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        if (!productId) {
          setError('Product ID is missing');
          return;
        }

        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data() as Omit<Product, 'id'>;
          setProduct({
            id: productSnap.id,
            ...data
          });
        } else {
          setError('Product not found');
        }
      } catch (error) {
        console.error('Error fetching product:', error);
        setError('Failed to load product. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // Handle input change (fixed version)
  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('customerInfo.address.')) {
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
    } else if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'customerInfo' && child in orderForm.customerInfo) {
        setOrderForm({
          ...orderForm,
          customerInfo: {
            ...orderForm.customerInfo,
            [child]: value
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

  // Validate form
  const validateForm = (): boolean => {
    const { customerInfo } = orderForm;
    
    // Check if address exists and has all required fields
    const hasValidAddress = customerInfo.address && 
      customerInfo.address.street?.trim() !== '' &&
      customerInfo.address.city?.trim() !== '' &&
      customerInfo.address.state?.trim() !== '' &&
      customerInfo.address.zipCode?.trim() !== '';
    
    return (
      customerInfo.fullName.trim() !== '' &&
      customerInfo.email.trim() !== '' &&
      customerInfo.phone.trim() !== '' &&
      hasValidAddress
    );
  };

  // Generate bill ID
  const generateBillId = (): string => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `BILL_${timestamp}_${randomStr}`;
  };

  // Create bill
  const createBill = async (): Promise<string> => {
    if (!product) return '';
    
    try {
      const billId = generateBillId();
      const billData: Bill = {
        billId,
        billDate: new Date(),
        billStatus: 'active',
        billType: 'product_purchase',
        amountPaid: product.price * orderForm.quantity,
        currency: 'INR',
        description: `Purchase of ${orderForm.quantity} x ${product.name}`,
        paymentMethod: orderForm.paymentMethod,
        paymentStatus: orderForm.paymentMethod === 'cash' ? 'pending' : 'paid',
        customerInfo: orderForm.customerInfo,
        products: [{
          productId: product.id,
          productName: product.name,
          quantity: orderForm.quantity,
          price: product.price
        }],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const billsRef = collection(db, 'bills');
      await addDoc(billsRef, billData);
      
      return billId;
    } catch (error) {
      console.error('Error creating bill:', error);
      throw new Error('Failed to create bill');
    }
  };

  // Update product stock
  const updateProductStock = async () => {
    if (!product) return;
    
    try {
      const productRef = doc(db, 'products', product.id);
      await updateDoc(productRef, {
        stock: increment(-orderForm.quantity),
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating product stock:', error);
      throw new Error('Failed to update product stock');
    }
  };

  // Handle place order
  const handlePlaceOrder = async () => {
    if (!validateForm() || !product) return;
    
    // Check stock availability
    if (orderForm.quantity > product.stock) {
      alert(`Only ${product.stock} items available in stock.`);
      return;
    }
    
    setOrderProcessing(true);
    try {
      // Create bill first
      const billId = await createBill();
      
      // Update product stock
      await updateProductStock();
      
      // Save order to Firebase
      const ordersRef = collection(db, 'orders');
      await addDoc(ordersRef, {
        productId: product.id,
        productName: product.name,
        quantity: orderForm.quantity,
        total: product.price * orderForm.quantity,
        paymentMethod: orderForm.paymentMethod,
        customerInfo: orderForm.customerInfo,
        billId,
        status: orderForm.paymentMethod === 'cash' ? 'pending_payment' : 'confirmed',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      alert(`Order placed successfully!${orderForm.paymentMethod === 'cash' ? ' Please keep cash ready for delivery.' : ''}`);
      setShowModal(false);
      
      // Refresh product to update stock
      const productRef = doc(db, 'products', product.id);
      const productSnap = await getDoc(productRef);
      if (productSnap.exists()) {
        const data = productSnap.data() as Omit<Product, 'id'>;
        setProduct({
          id: productSnap.id,
          ...data
        });
      }
      
    } catch (error) {
      console.error('Error placing order:', error);
      alert('Failed to place order. Please try again.');
    } finally {
      setOrderProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-black">
        <Layout>
          <main className="pt-16">
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-700" />
                <p className="text-xl text-gray-600">Loading product...</p>
              </div>
            </div>
          </main>
        </Layout>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-white text-black">
        <Layout>
          <main className="pt-16">
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error || 'Product not found'}
                </div>
                <button 
                  onClick={() => navigate('/shop')} 
                  className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800 transition-colors"
                >
                  Back to Shop
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
          {/* Back button */}
          <div className="max-w-6xl mx-auto px-4 py-6">
            <button 
              onClick={() => navigate('/shop')}
              className="flex items-center text-blue-700 hover:text-blue-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Shop
            </button>
          </div>

          {/* Product Details */}
          <section className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Product Images */}
                <div>
                  <div className="rounded-2xl overflow-hidden bg-gray-100">
                    <img
                      src={product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=600&fit=crop&crop=center'}
                      alt={product.name}
                      className="w-full h-96 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600&h=600&fit=crop&crop=center';
                      }}
                    />
                  </div>
                  
                  {product.images && product.images.length > 1 && (
                    <div className="grid grid-cols-4 gap-2 mt-4">
                      {product.images.slice(0, 4).map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${product.name} ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg cursor-pointer"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=150&h=150&fit=crop&crop=center';
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div>
                  <div className="mb-4">
                    <span className="text-sm text-blue-600 uppercase tracking-wide font-medium">
                      {product.category}
                    </span>
                  </div>
                  
                  <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    {product.name}
                    
                    {/* Premium Badge */}
                    {product.isPremium && (
                      <span className="ml-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white px-2 py-1 rounded-full text-xs font-medium align-middle">
                        <Crown className="w-3 h-3 inline mr-1" />
                        Premium
                      </span>
                    )}
                    
                    {/* Approved Badge */}
                    {product.adminApproved && (
                      <span className="ml-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-1 rounded-full text-xs font-medium align-middle">
                        <CheckCircle className="w-3 h-3 inline mr-1" />
                        Approved
                      </span>
                    )}
                  </h1>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {product.description}
                  </p>
                  
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-3xl font-bold text-gray-900">
                          ₹{product.price.toFixed(2)}
                        </span>
                      </div>
                      
                      <div>
                        {product.stock > 0 ? (
                          <span className="text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
                            In Stock: {product.stock}
                          </span>
                        ) : (
                          <span className="text-sm text-red-600 bg-red-50 px-3 py-1 rounded-full">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {product.stock > 0 && (
                      <div className="mb-4">
                        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
                          Quantity
                        </label>
                        <select
                          id="quantity"
                          value={orderForm.quantity}
                          onChange={(e) => setOrderForm({...orderForm, quantity: parseInt(e.target.value)})}
                          className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {Array.from({ length: Math.min(10, product.stock) }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <button
                      onClick={() => setShowModal(true)}
                      disabled={product.stock <= 0}
                      className={`w-full py-3 font-semibold rounded-lg transition-all duration-300 ${
                        product.stock <= 0 
                          ? 'bg-gray-400 text-gray-700 cursor-not-allowed' 
                          : 'bg-blue-700 text-white hover:bg-blue-800'
                      }`}
                    >
                      {product.stock <= 0 ? 'Out of Stock' : 'Buy Now'}
                    </button>
                    
                    <button
                      onClick={() => navigate('/shop')}
                      className="w-full py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Continue Shopping
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Purchase Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Complete Your Purchase</h2>
                <button
                  onClick={() => setShowModal(false)}
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
                    src={product.images && product.images.length > 0 ? product.images[0] : 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center'}
                    alt={product.name}
                    className="w-20 h-20 object-cover rounded-lg"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&crop=center';
                    }}
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-gray-600 text-sm">{product.category}</p>
                    <p className="text-lg font-bold text-blue-700">₹{product.price.toFixed(2)}</p>
                    <p className="text-sm text-gray-600">In Stock: {product.stock}</p>
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
                    {Array.from({ length: Math.min(10, product.stock) }, (_, i) => i + 1).map(num => (
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
                  <div className="grid grid-cols-1 gap-3">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          onClick={() => handleInputChange('paymentMethod', method.id)}
                          className={`p-4 border rounded-lg text-left transition-all ${
                            orderForm.paymentMethod === method.id
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-6 h-6" />
                            <div>
                              <div className="font-medium">{method.name}</div>
                              <div className="text-sm text-gray-600">{method.description}</div>
                            </div>
                          </div>
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
                      <span>₹{product.price.toFixed(2)}</span>
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
                      <span>₹{(product.price * orderForm.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex gap-4 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowModal(false)}
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
                    `Place Order ${orderForm.paymentMethod === 'cash' ? '(Cash)' : ''}`
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

export default ProductInfoPage;
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc, increment, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import Layout from './Layout';
import { ArrowLeft, Crown, CheckCircle, MapPin, DollarSign, Smartphone, CreditCard, Wallet, Loader2, X, Package } from 'lucide-react';
import { useAuth } from '../../firebase/auth';

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
  userId: string;
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

  const { user } = useAuth();

  const paymentMethods: PaymentMethod[] = [
    { id: 'cash', name: 'Cash on Delivery', icon: DollarSign, description: 'Pay with cash when your order is delivered' },
    { id: 'upi', name: 'UPI', icon: Smartphone, description: 'Pay using UPI apps like Google Pay, PhonePe, Paytm' },
    { id: 'credit-card', name: 'Credit/Debit Card', icon: CreditCard, description: 'Pay using your credit or debit card' },
    { id: 'bank-transfer', name: 'Bank Transfer', icon: Wallet, description: 'Direct bank transfer' }
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        if (!productId) { setError('Product ID is missing'); return; }
        const productRef = doc(db, 'products', productId);
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          setProduct({ id: productSnap.id, ...(productSnap.data() as Omit<Product, 'id'>) });
        } else {
          setError('Product not found');
        }
      } catch (error) {
        setError('Failed to load product.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId]);

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('customerInfo.address.')) {
      const addressField = field.split('.')[2];
      setOrderForm({
        ...orderForm,
        customerInfo: {
          ...orderForm.customerInfo,
          address: { ...orderForm.customerInfo.address, [addressField]: value }
        }
      });
    } else if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setOrderForm({
        ...orderForm,
        customerInfo: { ...orderForm.customerInfo, [child]: value }
      });
    } else {
      setOrderForm({ ...orderForm, [field]: value });
    }
  };

  const validateForm = (): boolean => {
    const { customerInfo } = orderForm;
    return (
      customerInfo.fullName.trim() !== '' &&
      customerInfo.email.trim() !== '' &&
      customerInfo.phone.trim() !== '' &&
      customerInfo.address.street?.trim() !== '' &&
      customerInfo.address.city?.trim() !== ''
    );
  };

  const handlePlaceOrder = async () => {
    if (!validateForm() || !product || !user) return;
    setOrderProcessing(true);
    try {
      const billId = `BILL_${Date.now()}`;
      const ordersRef = collection(db, 'orders');
      await addDoc(ordersRef, {
        productId: product.id,
        productName: product.name,
        quantity: orderForm.quantity,
        total: product.price * orderForm.quantity,
        paymentMethod: orderForm.paymentMethod,
        customerInfo: orderForm.customerInfo,
        userId: user.uid,
        status: 'pending',
        createdAt: new Date()
      });
      alert('Order placed successfully!');
      setShowModal(false);
    } catch (error) {
      alert('Failed to place order.');
    } finally {
      setOrderProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Layout>
          <main className="pt-32 flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-[#1d4ed8]" />
            <p className="text-xl font-bold uppercase tracking-widest text-gray-400">Processing...</p>
          </main>
        </Layout>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Layout>
        <main className="pt-20">
          {/* Back Navigation */}
          <div className="max-w-6xl mx-auto px-4 py-6">
            <button 
              onClick={() => navigate('/shop')}
              className="flex items-center text-[#1d4ed8] font-black uppercase tracking-widest text-xs hover:text-[#ff6b6b] transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Catalog
            </button>
          </div>

          <section className="py-8">
            <div className="max-w-6xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Images Section */}
                <div className="space-y-4">
                  <div className="rounded-[2rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-xl">
                    <img
                      src={product?.images?.[0] || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=600'}
                      alt={product?.name}
                      className="w-full h-[500px] object-cover"
                    />
                  </div>
                  <div className="flex gap-4">
                    {product?.images?.slice(1, 5).map((img, i) => (
                      <img key={i} src={img} className="w-20 h-20 rounded-xl object-cover border border-gray-100" />
                    ))}
                  </div>
                </div>

                {/* Info Section */}
                <div className="flex flex-col">
                  <div className="mb-4">
                    <span className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-[0.3em] bg-[#ff6b6b]/10 px-3 py-1 rounded-full">
                      {product?.category}
                    </span>
                  </div>
                  
                  <h1 className="text-4xl md:text-5xl font-black text-[#0f172a] mb-6 uppercase tracking-tighter leading-tight">
                    {product?.name}
                    {product?.isPremium && (
                      <Crown className="inline-block ml-4 w-8 h-8 text-[#ff6b6b]" />
                    )}
                  </h1>
                  
                  <p className="text-gray-500 text-lg leading-relaxed mb-8 font-medium">
                    {product?.description}
                  </p>
                  
                  <div className="bg-gray-50 rounded-3xl p-8 mb-8 flex items-center justify-between border border-gray-100">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">Price</span>
                      <span className="text-4xl font-black text-[#1d4ed8]">₹{product?.price.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white ${product?.stock! > 0 ? 'bg-green-500' : 'bg-[#ff6b6b]'}`}>
                        {product?.stock! > 0 ? `In Stock` : 'Sold Out'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowModal(true)}
                      disabled={product?.stock! <= 0}
                      className="flex-1 bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest py-5 rounded-2xl shadow-lg transition-all transform hover:-translate-y-1 disabled:bg-gray-200"
                    >
                      {product?.stock! <= 0 ? 'Waitlist' : 'Proceed to Checkout'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* Modal - Strictly White/Blue/Red */}
        {showModal && (
          <div className="fixed inset-0 bg-[#0f172a]/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-[2.5rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border-t-8 border-[#ff6b6b]">
              <div className="flex items-center justify-between p-8 border-b border-gray-50">
                <h2 className="text-2xl font-black text-[#0f172a] uppercase tracking-tighter">Checkout</h2>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-[#ff6b6b]">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                {/* Payment Selection */}
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Payment Gateway</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.id}
                          onClick={() => handleInputChange('paymentMethod', method.id)}
                          className={`p-4 border-2 rounded-2xl text-left transition-all flex items-center gap-4 ${
                            orderForm.paymentMethod === method.id ? 'border-[#1d4ed8] bg-[#1d4ed8]/5' : 'border-gray-100 opacity-60'
                          }`}
                        >
                          <Icon className={`w-6 h-6 ${orderForm.paymentMethod === method.id ? 'text-[#1d4ed8]' : 'text-gray-400'}`} />
                          <span className="font-bold text-sm uppercase tracking-tight">{method.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Shipping Details</label>
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="w-full p-4 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#1d4ed8] outline-none font-bold"
                    onChange={(e) => handleInputChange('customerInfo.fullName', e.target.value)}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="email"
                      placeholder="Email"
                      className="w-full p-4 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#1d4ed8] outline-none font-bold"
                      onChange={(e) => handleInputChange('customerInfo.email', e.target.value)}
                    />
                    <input
                      type="tel"
                      placeholder="Phone"
                      className="w-full p-4 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#1d4ed8] outline-none font-bold"
                      onChange={(e) => handleInputChange('customerInfo.phone', e.target.value)}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Street Address"
                    className="w-full p-4 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-[#1d4ed8] outline-none font-bold"
                    onChange={(e) => handleInputChange('customerInfo.address.street', e.target.value)}
                  />
                </div>

                {/* Order Summary */}
                <div className="bg-[#0f172a] p-8 rounded-3xl text-white">
                   <div className="flex justify-between items-center">
                     <span className="text-xs font-black uppercase tracking-widest text-[#ff6b6b]">Grand Total</span>
                     <span className="text-3xl font-black">₹{(product?.price! * orderForm.quantity).toLocaleString()}</span>
                   </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50 flex gap-4">
                <button
                  onClick={handlePlaceOrder}
                  disabled={orderProcessing || !validateForm()}
                  className="flex-1 py-5 bg-[#ff6b6b] text-white font-black uppercase tracking-[0.2em] rounded-2xl shadow-xl hover:bg-[#fa5252] transition-all flex items-center justify-center gap-3"
                >
                  {orderProcessing ? <Loader2 className="animate-spin w-5 h-5" /> : 'Confirm Order'}
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
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from "react-router-dom";
import { Loader2, Search, Filter,  } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
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
  isPremium?: boolean;
  adminApproved?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

const ITEMS_PER_PAGE = 8;

const ShopPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const productsRef = collection(db, 'products');
        const q = query(productsRef, where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
        const fetchedProducts: Product[] = [];
        querySnapshot.forEach((doc) => {
          fetchedProducts.push({ id: doc.id, ...(doc.data() as Omit<Product, 'id'>) });
        });
        setProducts(fetchedProducts);
      } catch (err) {
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const allCategories = products.map(product => product.category);
    return ['all', ...new Set(allCategories)].sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            product.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // const handlePageChange = (page: number) => {
  //   setCurrentPage(page);
  //   window.scrollTo({ top: 0, behavior: 'smooth' });
  // };

  // const resetFilters = () => {
  //   setSearchTerm('');
  //   setSelectedCategory('all');
  //   setCurrentPage(1);
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Layout>
          <main className="pt-16 flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-[#1d4ed8]" />
              <p className="text-sm font-black uppercase tracking-widest text-gray-500">Syncing Catalog...</p>
            </div>
          </main>
        </Layout>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Layout>
        <main className="pt-16">
          {/* Hero section - Dark Background / White Text */}
          <section className="py-20 bg-[#0f172a] text-white border-b-8 border-[#ff6b6b]">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter">
                GSL <span className="text-[#ff6b6b]">MARKET</span>
              </h1>
              <div className="text-lg max-w-2xl mx-auto font-medium">
                <p className="text-white opacity-90">Curated collection of professional shooting equipment and apparel.</p>
                <div className="inline-block mt-6 px-4 py-1 bg-[#ff6b6b] rounded-full text-xs font-black uppercase tracking-widest text-white">
                  {products.length} Products Available
                </div>
              </div>
            </div>
          </section>

          {/* Filter Bar */}
          <section className="py-8 bg-gray-50 border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search gear..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ff6b6b] outline-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-6 py-3 rounded-xl font-bold uppercase text-xs tracking-widest transition-all ${showFilters ? 'bg-[#ff6b6b] text-white' : 'bg-white border text-gray-700'}`}
                >
                  <Filter className="w-4 h-4 inline mr-2" /> Filters
                </button>
              </div>
            </div>
            {showFilters && (
              <div className="max-w-7xl mx-auto px-4 mt-4">
                <div className="p-6 bg-white rounded-2xl border border-gray-100 flex flex-wrap gap-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider ${selectedCategory === cat ? 'bg-[#1d4ed8] text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Grid Section */}
          <section className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {paginatedProducts.map((product) => (
                  <div key={product.id} className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-[#ff6b6b]/20 transition-all flex flex-col">
                    <div className="relative h-64 bg-gray-50 overflow-hidden">
                      <img src={product.images?.[0] || '/default.jpg'} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {product.isPremium && <div className="absolute top-4 left-4 bg-[#ff6b6b] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Premium</div>}
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <span className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-widest mb-2">{product.category}</span>
                      <h3 className="text-lg font-black text-gray-900 mb-2 uppercase group-hover:text-[#1d4ed8] transition-colors">{product.name}</h3>
                      <p className="text-gray-500 text-sm mb-6 line-clamp-2">{product.description}</p>
                      <div className="mt-auto flex justify-between items-center">
                        <span className="text-xl font-black text-[#0f172a]">₹{product.price.toLocaleString()}</span>
                        <Link to={`/product/${product.id}`} className="bg-[#1d4ed8] text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#ff6b6b] transition-all">Details</Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Why Choose Us - White Background / Gray Text */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <h2 className="text-3xl md:text-5xl font-black mb-12 uppercase text-[#1d4ed8]">WHY CHOOSE <span className="text-[#ff6b6b]">GSL GEAR</span></h2>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { title: "Premium Quality", desc: "Curated to meet the highest professional standards.", color: "text-[#ff6b6b]" },
                  { title: "Best Prices", desc: "Competitive pricing for top-tier equipment.", color: "text-[#1d4ed8]" },
                  { title: "Verified Gear", desc: "Every product is authenticated and league-approved.", color: "text-[#ff6b6b]" }
                ].map((item, i) => (
                  <div key={i} className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
                    <h3 className={`text-xl font-black mb-4 uppercase ${item.color}`}>{item.title}</h3>
                    <p className="text-gray-600 font-medium">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA - Dark Background / White Text */}
          <section className="py-24 bg-[#0f172a] text-white relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-[#ff6b6b]"></div>
            <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
              <h2 className="text-3xl md:text-5xl font-black mb-6 uppercase tracking-tighter text-white">
                Ready to <span className="text-[#ff6b6b]">Shop?</span>
              </h2>
              <p className="text-lg mb-10 font-medium text-white opacity-80">
                Explore our full collection and discover products that match your shooting needs.
              </p>
              <Link to="/contact">
                <button className="bg-white text-[#1d4ed8] hover:bg-[#ff6b6b] hover:text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all transform hover:scale-105">
                  Contact Sales
                </button>
              </Link>
            </div>
          </section>
        </main>
      </Layout>
    </div>
  );
};

export default ShopPage;
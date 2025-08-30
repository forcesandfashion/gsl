import React from 'react';
import { Link } from "react-router-dom";
import { ExternalLink, ArrowRight } from 'lucide-react';
import Layout from "./Layout";

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  description: string;
  websiteUrl: string;
  productUrl: string;
}

const ShopPage: React.FC = () => {
  const products: Product[] = [
    {
      id: 1,
      name: "Urban Streetwear Hoodie",
      price: 89.99,
      originalPrice: 120.00,
      image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop&crop=center",
      category: "Hoodies",
      description: "Premium quality urban streetwear hoodie made with soft cotton blend. Perfect for casual wear and street style fashion.",
      websiteUrl: "https://example-store.com",
      productUrl: "https://example-store.com/products/urban-streetwear-hoodie"
    },
    {
      id: 2,
      name: "Premium Denim Jacket",
      price: 129.99,
      image: "https://images.unsplash.com/photo-1551537482-f2075a1d41f2?w=400&h=400&fit=crop&crop=center",
      category: "Jackets",
      description: "Classic denim jacket crafted from premium denim fabric. A timeless piece that complements any wardrobe with style and durability.",
      websiteUrl: "https://example-store.com",
      productUrl: "https://example-store.com/products/premium-denim-jacket"
    },
    {
      id: 3,
      name: "Designer Cargo Pants",
      price: 75.50,
      originalPrice: 95.00,
      image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400&h=400&fit=crop&crop=center",
      category: "Pants",
      description: "Stylish cargo pants with multiple pockets and modern fit. Combines functionality with contemporary design for everyday comfort.",
      websiteUrl: "https://example-store.com",
      productUrl: "https://example-store.com/products/designer-cargo-pants"
    },
    {
      id: 4,
      name: "Limited Edition Sneakers",
      price: 199.99,
      image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop&crop=center",
      category: "Footwear",
      description: "Exclusive limited edition sneakers featuring premium materials and innovative design. Perfect for sneaker enthusiasts and collectors.",
      websiteUrl: "https://example-store.com",
      productUrl: "https://example-store.com/products/limited-edition-sneakers"
    },
    {
      id: 5,
      name: "Minimalist Backpack",
      price: 65.00,
      image: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&crop=center",
      category: "Accessories",
      description: "Sleek minimalist backpack designed for modern professionals. Spacious interior with organized compartments for daily essentials.",
      websiteUrl: "https://example-store.com",
      productUrl: "https://example-store.com/products/minimalist-backpack"
    },
    {
      id: 6,
      name: "Statement Graphic Tee",
      price: 39.99,
      originalPrice: 55.00,
      image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&crop=center",
      category: "T-Shirts",
      description: "Bold graphic t-shirt made from premium cotton. Features unique artwork and comfortable fit for casual everyday wear.",
      websiteUrl: "https://example-store.com",
      productUrl: "https://example-store.com/products/statement-graphic-tee"
    },
    {
      id: 7,
      name: "Professional Blazer",
      price: 149.99,
      image: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=400&fit=crop&crop=center",
      category: "Blazers",
      description: "Elegant professional blazer tailored for business and formal occasions. Premium fabric with modern cut and sophisticated styling.",
      websiteUrl: "https://example-store.com",
      productUrl: "https://example-store.com/products/professional-blazer"
    },
    {
      id: 8,
      name: "Casual Summer Dress",
      price: 79.99,
      originalPrice: 99.99,
      image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop&crop=center",
      category: "Dresses",
      description: "Light and airy summer dress perfect for warm weather. Flattering silhouette with breathable fabric and elegant design details.",
      websiteUrl: "https://example-store.com",
      productUrl: "https://example-store.com/products/casual-summer-dress"
    }
  ];

  const handleVisitStore = (websiteUrl: string) => {
    window.open(websiteUrl, '_blank');
  };

  const handleViewProduct = (productUrl: string) => {
    window.open(productUrl, '_blank');
  };

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
                  Discover our curated collection of premium products. Each item is carefully selected to meet the highest standards of quality and design.
                </p>
              </div>
            </div>
          </section>

          {/* Products Grid */}
          <section className="py-20 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {products.map((product) => (
                  <div key={product.id} className="bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 flex flex-col h-full">
                    
                    {/* Product Image */}
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                      {product.originalPrice && (
                        <div className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          SALE
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

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-gray-900">
                            ${product.price}
                          </span>
                          {product.originalPrice && (
                            <>
                              <span className="text-lg text-gray-500 line-through">
                                ${product.originalPrice}
                              </span>
                              <span className="text-sm font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                Save ${(product.originalPrice - product.price).toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="mt-auto space-y-3">
                        <button
                          onClick={() => handleViewProduct(product.productUrl)}
                          className="w-full py-3 bg-blue-700 text-white font-semibold rounded-lg transition-all duration-300 hover:bg-blue-800 flex items-center justify-center gap-2"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View Product
                        </button>
                        
                        <button
                          onClick={() => handleVisitStore(product.websiteUrl)}
                          className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg transition-all duration-300 hover:bg-gray-200 flex items-center justify-center gap-2"
                        >
                          <ArrowRight className="w-4 h-4" />
                          Visit Store
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Product Categories */}
          <section className="py-20 bg-white">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Product Categories
                </h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                  Browse our extensive range of products across different categories
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {['Hoodies', 'Jackets', 'Pants', 'Footwear', 'Accessories', 'T-Shirts', 'Blazers', 'Dresses'].map((category, index) => (
                  <div key={index} className="bg-gradient-to-br from-blue-50 to-white p-6 rounded-xl shadow-sm border border-blue-100 text-center hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                    <h3 className="text-lg font-semibold text-blue-700 mb-2">
                      {category}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Premium quality {category.toLowerCase()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

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
                  <h3 className="text-xl font-bold mb-4 text-gray-900">Fast Delivery</h3>
                  <p className="text-gray-600">
                    Quick and reliable shipping to get your products delivered safely and on time.
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
                Explore our full collection and discover products that match your style and needs.
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <button
                  onClick={() => window.open('https://example-store.com', '_blank')}
                  className="bg-white text-blue-700 hover:bg-gray-100 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Visit Our Store
                </button>
                <Link to="/contact">
                  <button className="bg-transparent border-2 border-white hover:bg-white hover:text-blue-700 px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105">
                    Contact Us
                  </button>
                </Link>
              </div>
            </div>
          </section>
        </main>
      </Layout>
    </div>
  );
};

export default ShopPage;
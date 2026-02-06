"use client";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import React, { useState } from "react";
import Layout from "./Layout";
import { ChevronRight, Play, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/firebase/auth";

const ParallaxScrollPage: React.FC = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);

  const [images] = useState([
    { id: 1, path: "/news1.png" },
    { id: 2, path: "/siteimages/1.JPG" },
    { id: 3, path: "/news2.png" },
    { id: 4, path: "/news6.png" },
    { id: 5, path: "/siteimages/4.jpg" },
    { id: 6, path: "/siteimages/2.JPG" },
    { id: 7, path: "/siteimages/3.JPG" },
    { id: 8, path: "/siteimages/6.JPG" },
    { id: 9, path: "/siteimages/7.JPG" },
    { id: 10, path: "/siteimages/8.JPG" },
    { id: 11, path: "/news4.png" },
    { id: 12, path: "/news5.png" },
    { id: 13, path: "/news6.png" },
    { id: 14, path: "/news8.png" },
    { id: 15, path: "/news10.png" },
  ]);

  const articles = [
    { title: "Magazine 9", image: "/images/mag9-img.png", mag: "https://heyzine.com/flip-book/e8ff28e240.html" },
    { title: "Global Shooting League Magazine Brochure", image: "/images/GSL-brochure.png", mag: "https://heyzine.com/flip-book/4a86e2c1d3.html" },
    { title: "Magazine 8", image: "/images/mag8-img.png", mag: "https://heyzine.com/flip-book/827d5bc5b6.html" },
    { title: "Magazine 7", image: "/images/mag7-img.png", mag: "https://heyzine.com/flip-book/8391562bd3.html" },
    { title: "Magazine 6", image: "/images/mag6-img.png", mag: "https://heyzine.com/flip-book/485b972e41.html" },
    { title: "Magazine 5", image: "/images/mag5img.png", mag: "https://heyzine.com/flip-book/d121dec505.html" },
    { title: "Magazine 4", image: "/images/mag4img.png", mag: "https://heyzine.com/flip-book/a1865cff61.html" },
    { title: "Magazine 3", image: "/mag3img.png", mag: "https://heyzine.com/flip-book/1a14246600.html" },
    { title: "Magazine 2", image: "/mag2img.png", mag: "https://heyzine.com/flip-book/d09a374aec.html" },
    { title: "Magazine 1", image: "/mag1img.png", mag: "https://heyzine.com/flip-book/ecc71056ed.html" },
  ];

  const openMagazine = (file) => {
    window.open(file, "_blank");
  };

  const closeVideoModal = () => {
    setSelectedVideo(null);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white mt-10 p-4 md:p-8">
        
        {/* Magazine Section - Blue Theme */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8 border-b-2 border-gray-100 pb-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                Featured <span className="text-[#ff6b6b]">Magazines</span>
              </h2>
            </div>
            <button className="text-[#1d4ed8] font-black uppercase tracking-widest text-xs hover:text-[#ff6b6b] transition-colors flex items-center">
              View All
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>

          <Swiper
            modules={[Navigation, Autoplay]}
            slidesPerView={1}
            spaceBetween={30}
            navigation
            loop={true}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            breakpoints={{
              640: { slidesPerView: 2 },
              1024: { slidesPerView: 3 },
            }}
            className="pb-12"
          >
            {articles.map((article, index) => (
              <SwiperSlide key={index}>
                <div
                  className="group cursor-pointer bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-[#ff6b6b]/30 transition-all shadow-sm hover:shadow-xl p-2"
                  onClick={() => openMagazine(article.mag)}
                >
                  <div className="overflow-hidden rounded-xl aspect-[3/4]">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>
                  <div className="mt-5 flex justify-between items-center px-2 pb-2">
                    <p className="font-bold text-gray-800 uppercase text-xs truncate flex-1 tracking-tight">
                      {article.title}
                    </p>
                    <span className="text-[#1d4ed8] font-black text-[10px] uppercase flex items-center ml-4 group-hover:text-[#ff6b6b]">
                      Read Now
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </span>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>

        {/* YouTube Videos Section - Red Theme */}
        <div className="mb-20">
          <div className="flex items-center justify-between mb-8 border-b-2 border-gray-100 pb-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-[#ff6b6b] uppercase tracking-tighter">
                Featured <span className="text-[#1d4ed8]">Videos</span>
              </h2>
            </div>
            <button className="text-[#ff6b6b] font-black uppercase tracking-widest text-xs hover:text-[#1d4ed8] transition-colors flex items-center">
              Watch All
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>

          <div className="flex justify-center">
            <div className="relative w-full max-w-4xl aspect-video rounded-[2rem] overflow-hidden shadow-2xl group border-8 border-white">
              <a
                href="https://www.youtube.com/watch?v=iLd34M-SboQ"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full h-full"
              >
                <img
                  src="/featured-cover.png"
                  alt="Featured Video"
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 flex items-center justify-center transition-colors">
                  <div className="bg-[#ff6b6b] text-white rounded-full w-24 h-24 flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
                    <Play className="h-12 w-12 fill-current ml-2" />
                  </div>
                </div>
              </a>
            </div>
          </div>
        </div>

        {/* Gallery Section - Blue/Red Accent */}
        <div className="pb-20">
          <div className="flex items-center justify-between mb-8 border-b-2 border-gray-100 pb-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                Image <span className="text-[#ff6b6b]">Gallery</span>
              </h2>
            </div>
            <button className="text-[#1d4ed8] font-black uppercase tracking-widest text-xs hover:text-[#ff6b6b] transition-colors flex items-center">
              Expand
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {images.map((image) => (
              <div
                key={image.id}
                className="relative group overflow-hidden rounded-3xl shadow-lg transition-all duration-500 border border-gray-100 hover:border-[#ff6b6b]/30"
              >
                {/* Visual Accent Bar */}
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#ff6b6b] z-10"></div>

                <div
                  className="relative w-full aspect-video bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                  style={{
                    backgroundImage: `url(${image.path})`,
                  }}
                >
                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-[#0f172a]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/90 p-4 rounded-full shadow-2xl">
                       <ChevronRight className="w-6 h-6 text-[#1d4ed8]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Video Modal remains structural, styling is pure black/white overlay */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-5xl">
            <button
              onClick={closeVideoModal}
              className="absolute -top-16 right-0 text-white hover:text-[#ff6b6b] transition-colors"
            >
              <X className="h-10 w-10" />
            </button>
            <div className="relative pb-[56.25%] h-0 shadow-2xl rounded-3xl overflow-hidden border-4 border-white/10">
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src={`https://www.youtube.com/embed/${selectedVideo}?autoplay=1`}
                title="GSL Video Player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ParallaxScrollPage;
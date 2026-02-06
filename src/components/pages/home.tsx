import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronRight, Settings, User, Menu } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../firebase/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import { useState } from "react";
import HeroSection from "../dashboard/HeroSeciton";
import rangesData from "../../../public/ranges.json";
import Map from "../dashboard/Map";
import NewsForum from "../dashboard/News";
import Gallery from "../dashboard/Gallery";
import InfiniteCarousel from "../dashboard/Infinitemoving";
import TeamVictorySection from "../dashboard/Victory";
import RankingsSection from "../dashboard/RankingSection";
import Footer from "../dashboard/Footer";
import ExecutiveCommittee from "../dashboard/Team";
import MediaSection from "../dashboard/Fame";
import Layout from "./Layout";
import EventsSection from "../dashboard/Events";

export default function LandingPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [ranges, setRanges] = useState(rangesData);
  const [selectedRange, setSelectedRange] = useState(null);
  const [visibleCount, setVisibleCount] = useState(3);
  const filteredRanges = ranges.filter(
    (range) =>
      range.name.toLowerCase().includes(search.toLowerCase()) ||
      range.address.toLowerCase().includes(search.toLowerCase())
  );

  // Carousel slide data
  const carouselSlides = [
    {
      title: "FOCUS",
      subtitle: "Greatness begins in the mind. Focus not just with your eyes, but with unwavering intent.",
      image: "/GSL1.JPG",
      cta: "Learn the mental game",
      url: "https://docs.google.com/forms/d/1M0X1fogAsXitDTiH6eT2PzLTeH6TkARser65F774WYE/viewform?edit_requested=true",
      align: "left"
    },
    {
      title: "AIM",
      subtitle: "Hold steady. Tune out everything else. The path to the target begins with quiet determination.",
      image: "/GSL3.JPG",
      cta: "Improve your technique",
      url: "https://docs.google.com/forms/d/1M0X1fogAsXitDTiH6eT2PzLTeH6TkARser65F774WYE/viewform?edit_requested=true",
      align: "right"
    },
    {
      title: "BREATHE",
      subtitle: "Your breath is your anchor. Inhale clarity. Exhale fear. Find power in stillness.",
      image: "/GSL2.jpg",
      cta: "Master your breathing",
      url: "https://docs.google.com/forms/d/1M0X1fogAsXitDTiH6eT2PzLTeH6TkARser65F774WYE/viewform?edit_requested=true",
      align: "left"
    },
    {
      title: "SHOOT",
      subtitle: "When preparation meets the perfect second, shoot like there's no turning back.",
      image: "/GSL11.JPG",
      cta: "Perfect your form",
      url: "https://docs.google.com/forms/d/1M0X1fogAsXitDTiH6eT2PzLTeH6TkARser65F774WYE/viewform?edit_requested=true",
      align: "right"
    },
    {
      title: "REPEAT",
      subtitle: "Repeat the ritual. Repeat the mindset. Repeat the excellence—until it becomes who you are.",
      image: "/GSL7.JPG",
      cta: "Join our training program",
      url: "https://docs.google.com/forms/d/1M0X1fogAsXitDTiH6eT2PzLTeH6TkARser65F774WYE/viewform?edit_requested=true",
      align: "left"
    },
  ];

  const homeMagazines = [
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

  return (
    <Layout>
      <div className="min-h-screen bg-white text-gray-900">
        <main>
          {/* Hero Carousel */}
          <section className="relative">
            <Swiper
              modules={[Navigation, Autoplay]}
              slidesPerView={1}
              navigation
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              className="w-full"
            >
              {carouselSlides.map((slide, index) => (
                <SwiperSlide key={index}>
                  <div className="relative h-[60vh] sm:h-[70vh] md:h-[80vh] w-full overflow-hidden">
                    <div
                      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                      style={{
                        backgroundImage: `url(${slide.image})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'contain',
                        backgroundColor: '#1e293b', // Dark blue-gray for letterboxing
                        width: '100%',
                        height: '100%',
                      }}
                    ></div>
                    {/* Darker Gradient for text legibility */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent py-8 flex flex-col justify-end">
                      <div className={`container mx-auto px-8 ${slide.align === 'left' ? 'text-left' : 'text-right'}`}>
                        <div className={`${slide.align === 'left' ? 'mr-auto' : 'ml-auto'} max-w-2xl p-6`}>
                          <h2 className="text-3xl sm:text-4xl md:text-6xl font-black tracking-tight mb-3 leading-tight text-white uppercase">
                            {slide.title}
                          </h2>
                          <p className="text-base sm:text-lg md:text-xl mb-6 font-medium text-white/90">
                            {slide.subtitle}
                          </p>
                          <div className={`${slide.align === 'right' ? 'flex justify-end' : ''}`}>
                            {/* CTA Button in Red */}
                            <a
                              href={slide.url}
                              target="_blank"
                              className="inline-block bg-blue-700 hover:bg-[#fa5252] text-white font-bold rounded-full px-6 py-4 text-sm sm:text-base uppercase tracking-widest shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                            >
                              {slide.cta}
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </section>

          <EventsSection />

          <div className="text-center mt-16 mb-8">
            {/* Global Rankings with Red Header and Blue underline */}
            <h2 className="text-4xl md:text-5xl font-black text-[#ff6b6b] uppercase tracking-tighter">GLOBAL RANKINGS</h2>
            <div className="w-20 h-1.5 bg-[#1d4ed8] mx-auto mt-3"></div>
          </div>
          <RankingsSection />

          <div className="py-12 bg-gray-50">
            <NewsForum />
          </div>

          <div className="container mx-auto p-4 max-w-7xl mt-12">
            {/* Magazine Header in Red */}
            <h2 className="text-4xl md:text-5xl font-black text-center mb-10 text-[#ff6b6b] uppercase tracking-tighter">MAGAZINES</h2>
            <Swiper
              modules={[Navigation, Autoplay]}
              slidesPerView={1}
              spaceBetween={30}
              navigation={true}
              breakpoints={{
                640: { slidesPerView: 2 },
                1024: { slidesPerView: 3 },
              }}
              className="pb-12"
            >
              {homeMagazines.map((article, index) => (
                <SwiperSlide key={index}>
                  <div
                    className="group cursor-pointer bg-white p-2 rounded-xl border border-transparent hover:border-[#ff6b6b]/30 transition-all shadow-sm hover:shadow-xl"
                    onClick={() => window.open(article.mag, "_blank")}
                  >
                    <div className="overflow-hidden rounded-lg aspect-[3/4]">
                      <img
                        src={article.image}
                        alt={article.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    </div>
                    <div className="mt-5 flex justify-between items-center px-2">
                      <p className="font-extrabold text-gray-800 uppercase text-sm truncate flex-1 tracking-tight">
                        {article.title}
                      </p>
                      {/* Read Link in Red */}
                      <span className="text-[#ff6b6b] font-black text-xs uppercase flex items-center ml-4 group-hover:underline">
                        Read Now
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </span>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>

          <Gallery />

          {/* Founder's Desk with Red Accents */}
          <section className="py-20 bg-white px-4 border-t border-gray-100">
            <div className="max-w-6xl mx-auto text-center">
              <h2 className="text-4xl md:text-5xl font-black text-[#1d4ed8] mb-10 uppercase tracking-tighter">
                FOUNDER'S <span className="text-[#ff6b6b]">DESK</span>
              </h2>
              <div className="flex justify-center">
                <div className="relative w-full max-w-4xl aspect-video rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(255,107,107,0.2)] group border-8 border-white">
                  <a
                    href="https://www.youtube.com/watch?v=iLd34M-SboQ"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
                  >
                    <img
                      src="/featured-cover.png"
                      alt="Watch Our Story Video"
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      {/* Play Button in Red */}
                      <div className="bg-[#ff6b6b] text-white rounded-full w-24 h-24 flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
                        <svg className="h-12 w-12 fill-current ml-2" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Mission Section with heavy Red/Blue theme */}
          <section className="py-24 bg-[#f8fafc]">
            <div className="max-w-5xl mx-auto px-6">
              <div className="bg-white rounded-[3rem] p-10 md:p-20 shadow-xl border-t-8 border-[#ff6b6b]">
                <h2 className="text-4xl md:text-6xl font-black text-[#1d4ed8] mb-12 text-center uppercase tracking-tighter">
                  Our <span className="text-[#ff6b6b]">Mission</span>
                </h2>
                <div className="text-lg md:text-xl text-gray-600 leading-relaxed text-justify">
                  <p className="mb-10 font-bold text-gray-800 text-2xl border-l-8 border-[#ff6b6b] pl-8">
                    Building a thriving ecosystem for sports shooting by uniting shooters, coaches, and manufacturers under one roof.
                  </p>
                  <ul className="grid md:grid-cols-2 gap-8 text-left mt-12">
                    {[
                      "Promote awareness and participation globally.",
                      "Establish world-class infrastructure in every region.",
                      "Drive professional development via data-driven talent management.",
                      "Facilitate indigenous manufacturing for top-tier equipment."
                    ].map((item, i) => (
                      <li key={i} className="flex items-start bg-gray-50 p-6 rounded-2xl border-b-4 border-[#1d4ed8]">
                        <span className="bg-[#ff6b6b] text-white p-1 rounded-full mr-4 mt-1">
                          <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>
                        </span>
                        <span className="font-bold text-gray-800">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-16 text-center text-[#ff6b6b] font-black text-xl uppercase tracking-widest italic">
                    Precision • Purpose • Passion
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </Layout>
  );
}
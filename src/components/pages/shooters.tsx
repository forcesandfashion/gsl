import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "./Layout";
import { db } from "@/firebase/config";
import { collection, getDocs } from "firebase/firestore";
import { ChevronLeft, ChevronRight } from "lucide-react"; // Added for UI

const Athletes = () => {
  const [athletes, setAthletes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAthletes, setFilteredAthletes] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Set to 8 or 12 as requested

  useEffect(() => {
    const getAllAthletes = async () => {
      try {
        setLoading(true);
        const staticRes = await fetch("/athletes.json");
        const staticData = await staticRes.json();

        const shootersCol = collection(db, "shooters");
        const shooterSnapshot = await getDocs(shootersCol);
        const dynamicData = shooterSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.fullName || "GSL Athlete",
            image: data.profileImage || "/default-avatar.png",
            gender: data.gender || "N/A",
            birthday: data.dob || "Unknown",
            isDynamic: true 
          };
        });

        const combined = [...staticData, ...dynamicData];
        setAthletes(combined);
        setFilteredAthletes(combined);
      } catch (error) {
        console.error("Error merging athlete data:", error);
      } finally {
        setLoading(false);
      }
    };
    getAllAthletes();
  }, []);

  // Update filtered athletes and RESET to page 1 on search
  useEffect(() => {
    const filtered = athletes.filter((athlete) =>
      athlete.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAthletes(filtered);
    setCurrentPage(1); 
  }, [searchTerm, athletes]);

  // --- Pagination Logic ---
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAthletes.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAthletes.length / itemsPerPage);

  const paginate = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Layout>
      <div className="bg-white min-h-screen py-16 px-4 sm:px-12">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-black text-[#1d4ed8] mb-4 uppercase tracking-tighter">
            ELITE <span className="text-[#ff6b6b]">SHOOTERS</span>
          </h1>
          <div className="w-24 h-1.5 bg-[#ff6b6b] mx-auto mb-6"></div>
        </motion.div>

        {/* Search Bar */}
        <div className="flex justify-center mb-16">
          <input
            type="text"
            placeholder="Search shooters..."
            className="w-full max-w-md px-6 py-4 rounded-full border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-[#1d4ed8] focus:outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Athletes Grid */}
        {loading ? (
          <div className="flex justify-center py-20 italic font-bold text-blue-600">LOADING REGISTRY...</div>
        ) : (
          <>
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10"
            >
              <AnimatePresence mode="popLayout">
                {currentItems.map((athlete) => (
                  <motion.div
                    key={athlete.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-lg"
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img src={athlete.image} alt={athlete.name} className="w-full h-full object-cover" />
                      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        <span className="bg-[#1d4ed8] text-white text-[10px] font-black uppercase px-3 py-1 rounded-full">{athlete.gender}</span>
                        {athlete.isDynamic && <span className="bg-[#ff6b6b] text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md">Verified</span>}
                      </div>
                    </div>
                    <div className="p-6">
                      <h2 className="text-xl font-black text-[#0f172a] uppercase truncate">{athlete.name}</h2>
                      <p className="text-gray-400 text-xs font-bold uppercase mt-2">Born: {athlete.birthday}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center mt-20 gap-4">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-3 rounded-full border-2 border-gray-100 hover:border-[#1d4ed8] disabled:opacity-30 disabled:hover:border-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-[#1d4ed8]" />
                </button>

                <div className="flex gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => paginate(i + 1)}
                      className={`w-10 h-10 rounded-full font-black text-xs transition-all ${
                        currentPage === i + 1 
                        ? "bg-[#1d4ed8] text-white shadow-lg" 
                        : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-3 rounded-full border-2 border-gray-100 hover:border-[#1d4ed8] disabled:opacity-30 disabled:hover:border-gray-100 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-[#1d4ed8]" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Athletes;
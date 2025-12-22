import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Layout from "./Layout";

const Athletes = () => {
  const [athletes, setAthletes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAthletes, setFilteredAthletes] = useState([]);

  useEffect(() => {
    // Fetching athletes from JSON file
    fetch("/athletes.json")
      .then((res) => res.json())
      .then((data) => {
        setAthletes(data);
        setFilteredAthletes(data);
      });
  }, []);

  // Update filtered athletes on search
  useEffect(() => {
    const filtered = athletes.filter((athlete) =>
      athlete.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAthletes(filtered);
  }, [searchTerm, athletes]);

  return (
    <Layout>
      <div className="bg-white min-h-screen py-16 px-4 sm:px-12">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          {/* Main Title in Blue */}
          <h1 className="text-5xl md:text-6xl font-black text-[#1d4ed8] mb-4 uppercase tracking-tighter">
            ELITE <span className="text-[#ff6b6b]">SHOOTERS</span>
          </h1>
          <div className="w-24 h-1.5 bg-[#ff6b6b] mx-auto mb-6"></div>
          <p className="text-gray-500 font-medium max-w-2xl mx-auto uppercase tracking-widest text-sm">
            Discover the incredible athletes who define excellence in shooting
            sports
          </p>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="flex justify-center mb-16"
        >
          <input
            type="text"
            placeholder="Search athletes by name..."
            className="w-full max-w-md px-6 py-4 text-gray-900 rounded-full border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-[#1d4ed8] focus:ring-4 focus:ring-[#1d4ed8]/10 focus:outline-none transition-all duration-300 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </motion.div>

        {/* Athletes Grid */}
        {filteredAthletes.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-gray-400 mt-12"
          >
            <p className="text-2xl font-black uppercase tracking-tighter">No athletes found</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ staggerChildren: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10"
          >
            {filteredAthletes.map((athlete) => (
              <motion.div
                key={athlete.id}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-lg hover:shadow-[0_20px_40px_rgba(255,107,107,0.15)] transition-all duration-300"
              >
                <div className="relative h-72 overflow-hidden">
                  <img
                    src={athlete.image}
                    alt={athlete.name}
                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                  />
                  {/* Subtle Gradient for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                  
                  {/* Gender Badge in Blue/Red */}
                  <div className="absolute top-4 right-4">
                    <span className="bg-[#1d4ed8] text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                      {athlete.gender}
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  {/* Name in Blue */}
                  <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight mb-3 group-hover:text-[#1d4ed8]">
                    {athlete.name}
                  </h2>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center text-gray-400 text-xs font-bold uppercase tracking-widest">
                      <span className="text-[#ff6b6b] mr-2">●</span>
                      Born: {athlete.birthday}
                    </div>
                    {/* Consistent Red Accent Line */}
                    <div className="w-8 h-1 bg-[#ff6b6b] mt-2"></div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
};

export default Athletes;
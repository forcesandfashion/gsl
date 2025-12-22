"use client";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const RankingsSection = () => {
  const [athletes, setAthletes] = useState({
    men: [],
    women: [],
  });
  const [menSearchTerm, setMenSearchTerm] = useState("");
  const [womenSearchTerm, setWomenSearchTerm] = useState("");

  const [menSortOption, setMenSortOption] = useState("name");
  const [womenSortOption, setWomenSortOption] = useState("name");

  const [filteredMen, setFilteredMen] = useState([]);
  const [filteredWomen, setFilteredWomen] = useState([]);

  useEffect(() => {
    fetch("/athletes.json")
      .then((response) => response.json())
      .then((data) => {
        const men = data
          .filter((athlete) => athlete.gender === "Male")
          .map((athlete) => ({
            name: athlete.name,
            event: athlete.achievements[0]?.event || "Not specified",
            img: athlete.image || "/images/default.jpg",
            country: athlete.country || "Not specified",
            age: athlete.age || 0,
            medals: calculateTotalMedals(athlete.medals) || 0,
          }));

        const women = data
          .filter((athlete) => athlete.gender === "Female")
          .map((athlete) => ({
            name: athlete.name,
            event: athlete.achievements[0]?.event || "Not specified",
            img: athlete.image || "/images/default.jpg",
            country: athlete.country || "Not specified",
            age: athlete.age || 0,
            medals: calculateTotalMedals(athlete.medals) || 0,
          }));

        setAthletes({ men, women });
        setFilteredMen(men);
        setFilteredWomen(women);
      })
      .catch((error) => console.error("Error fetching athlete data:", error));
  }, []);

  const calculateTotalMedals = (medals) => {
    if (!medals) return 0;
    let total = 0;
    Object.values(medals).forEach((category) => {
      if (category) {
        total +=
          ((category as any).gold || 0) +
          ((category as any).silver || 0) +
          ((category as any).bronze || 0);
      }
    });
    return total;
  };

  useEffect(() => {
    if (athletes.men.length === 0) return;
    const filtered = athletes.men.filter(
      (athlete) =>
        athlete.name.toLowerCase().includes(menSearchTerm.toLowerCase()) ||
        athlete.event.toLowerCase().includes(menSearchTerm.toLowerCase()) ||
        athlete.country.toLowerCase().includes(menSearchTerm.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => {
      switch (menSortOption) {
        case "name": return a.name.localeCompare(b.name);
        case "event": return a.event.localeCompare(b.event);
        case "country": return a.country.localeCompare(b.country);
        case "age-asc": return a.age - b.age;
        case "age-desc": return b.age - a.age;
        case "medals": return b.medals - a.medals;
        default: return 0;
      }
    });
    setFilteredMen(sorted);
  }, [menSearchTerm, menSortOption, athletes.men]);

  useEffect(() => {
    if (athletes.women.length === 0) return;
    const filtered = athletes.women.filter(
      (athlete) =>
        athlete.name.toLowerCase().includes(womenSearchTerm.toLowerCase()) ||
        athlete.event.toLowerCase().includes(womenSearchTerm.toLowerCase()) ||
        athlete.country.toLowerCase().includes(womenSearchTerm.toLowerCase())
    );
    const sorted = [...filtered].sort((a, b) => {
      switch (womenSortOption) {
        case "name": return a.name.localeCompare(b.name);
        case "event": return a.event.localeCompare(b.event);
        case "country": return a.country.localeCompare(b.country);
        case "age-asc": return a.age - b.age;
        case "age-desc": return b.age - a.age;
        case "medals": return b.medals - a.medals;
        default: return 0;
      }
    });
    setFilteredWomen(sorted);
  }, [womenSearchTerm, womenSortOption, athletes.women]);

  return (
    <section className="py-12 max-w-7xl mx-auto bg-white px-4 md:px-16">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Men's Rankings */}
        <div>
          <div className="flex justify-between items-end mb-6 border-b-2 border-gray-100 pb-2">
            <h2 className="text-xl md:text-2xl font-black text-[#1d4ed8] uppercase tracking-tighter">
              MEN&apos;S <span className="text-[#ff6b6b]">RANKINGS</span>
            </h2>
            <Link to="/shooters" className="text-[#1d4ed8] font-bold text-xs hover:text-[#ff6b6b] transition-colors uppercase tracking-widest">
              SEE ALL
            </Link>
          </div>

          <div className="flex flex-col mb-6 space-y-3">
            <input
              type="text"
              placeholder="Search men..."
              className="px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8]"
              value={menSearchTerm}
              onChange={(e) => setMenSearchTerm(e.target.value)}
            />
            <select
              className="px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium focus:border-[#1d4ed8]"
              value={menSortOption}
              onChange={(e) => setMenSortOption(e.target.value)}
            >
              <option value="name">Sort by Name</option>
              <option value="event">Sort by Event</option>
              <option value="country">Sort by Country</option>
              <option value="age-asc">Age (Youngest)</option>
              <option value="age-desc">Age (Oldest)</option>
              <option value="medals">Total Medals</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredMen.length > 0 ? (
              filteredMen.slice(0, 4).map((athlete, id) => (
                <div key={id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all p-1 pr-0 group">
                  <div className="p-4">
                    {/* Event label in Red */}
                    <p className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-widest mb-1">{athlete.event}</p>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors">{athlete.name}</h3>
                    <div className="flex items-center mt-1 text-xs font-bold text-gray-400 uppercase tracking-tighter">
                      <span>{athlete.country}</span>
                      <span className="mx-2 text-[#ff6b6b]">•</span>
                      <span>Age: {athlete.age}</span>
                    </div>
                  </div>
                  <img src={athlete.img} alt={athlete.name} className="w-24 h-24 object-cover rounded-lg m-1" />
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-gray-400 italic">No athletes found.</p>
            )}
          </div>
        </div>

        {/* Women's Rankings */}
        <div>
          <div className="flex justify-between items-end mb-6 border-b-2 border-gray-100 pb-2">
            <h2 className="text-xl md:text-2xl font-black text-[#1d4ed8] uppercase tracking-tighter">
              WOMEN&apos;S <span className="text-[#ff6b6b]">RANKINGS</span>
            </h2>
            <Link to="/shooters" className="text-[#1d4ed8] font-bold text-xs hover:text-[#ff6b6b] transition-colors uppercase tracking-widest">
              SEE ALL
            </Link>
          </div>

          <div className="flex flex-col mb-6 space-y-3">
            <input
              type="text"
              placeholder="Search women..."
              className="px-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1d4ed8]/20 focus:border-[#1d4ed8]"
              value={womenSearchTerm}
              onChange={(e) => setWomenSearchTerm(e.target.value)}
            />
            <select
              className="px-4 py-2 border border-gray-200 rounded-md bg-gray-50 text-sm font-medium focus:border-[#1d4ed8]"
              value={womenSortOption}
              onChange={(e) => setWomenSortOption(e.target.value)}
            >
              <option value="name">Sort by Name</option>
              <option value="event">Sort by Event</option>
              <option value="country">Sort by Country</option>
              <option value="age-asc">Age (Youngest)</option>
              <option value="age-desc">Age (Oldest)</option>
              <option value="medals">Total Medals</option>
            </select>
          </div>

          <div className="space-y-4">
            {filteredWomen.length > 0 ? (
              filteredWomen.slice(0, 4).map((athlete, index) => (
                <div key={index} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md transition-all p-1 pr-0 group">
                  <div className="p-4">
                    <p className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-widest mb-1">{athlete.event}</p>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#1d4ed8] transition-colors">{athlete.name}</h3>
                    <div className="flex items-center mt-1 text-xs font-bold text-gray-400 uppercase tracking-tighter">
                      <span>{athlete.country}</span>
                      <span className="mx-2 text-[#ff6b6b]">•</span>
                      <span>Age: {athlete.age}</span>
                    </div>
                  </div>
                  <img src={athlete.img} alt={athlete.name} className="w-24 h-24 object-cover rounded-lg m-1" />
                </div>
              ))
            ) : (
              <p className="text-center py-4 text-gray-400 italic">No athletes found.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RankingsSection;
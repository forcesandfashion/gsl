import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

const EventsSection: React.FC = () => {
  const eventCategories = [
    {
      id: "global",
      title: "Global Events",
      subtitle: "Olympics & World Championships",
      description:
        "Prestigious international competitions featuring the world's elite shooting athletes.",
      image: "/events/upcoming1.png",
      date: "Jul 24 - Aug 9",
      location: "Paris, France",
    },
    {
      id: "national",
      title: "National Events",
      subtitle: "Indian Championships",
      description:
        "Premier shooting competitions across India featuring the country's top talent.",
      image: "/events/upcoming2.png",
      date: "Sep 10 - 15",
      location: "New Delhi, India",
    },
    {
      id: "zonal",
      title: "Zonal Events",
      subtitle: "Regional Competitions",
      description:
        "Zone-wise shooting tournaments across different regions of India.",
      image: "/events/upcoming3.png",
      date: "Oct 5 - 8",
      location: "Mumbai, India",
    },
    {
      id: "roadtoolympics",
      title: "Road to Olympics",
      subtitle: "Qualification Events",
      description:
        "Crucial qualification events for athletes looking to secure Olympic berths.",
      image: "/news8.png",
      date: "Nov 12 - 18",
      location: "Multiple Venues",
    },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header in Blue consistent with Gallery/Founder Desk */}
        <h2 className="text-3xl md:text-5xl font-black text-center text-[#1d4ed8] mb-2 uppercase tracking-tighter">
          Shooting Events
        </h2>
        {/* Red accent underline */}
        <div className="w-20 h-1.5 bg-[#ff6b6b] mx-auto mb-10"></div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {eventCategories.map((category) => (
            <div
              key={category.id}
              className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group"
            >
              <div className="h-48 bg-gray-200 relative overflow-hidden">
                <img
                  src={category.image}
                  alt={category.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                {/* Date badge changed to Red (#ff6b6b) */}
                <div className="absolute top-4 left-4 bg-[#ff6b6b] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg">
                  {category.date}
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-black text-gray-900 mb-1 uppercase tracking-tight">
                  {category.title}
                </h3>
                {/* Subtitle changed to Red (#ff6b6b) to add more red as requested */}
                <p className="text-[#ff6b6b] text-sm font-bold mb-2 uppercase tracking-wide">
                  {category.subtitle}
                </p>
                <p className="text-gray-500 text-sm font-medium mb-3 flex items-center">
                   <span className="w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                   {category.location}
                </p>
                <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                  {category.description}
                </p>
                <Link
                  to={`/events/${category.id}`}
                  /* Link in Blue */
                  className="text-[#1d4ed8] hover:text-[#ff6b6b] transition-colors font-black text-xs uppercase tracking-widest inline-flex items-center"
                >
                  Explore events <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          {/* Main Button in Blue */}
          <button 
            className="bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest rounded-full px-10 py-4 transition-all transform hover:-translate-y-1 shadow-lg" 
            onClick={() => {}}
          >
            View All Events
          </button>
        </div>
      </div>
    </section>
  );
};

export default EventsSection;
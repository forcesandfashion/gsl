import React from "react";
import Layout from "./Layout";
import { ChevronRight } from "lucide-react";

// SVG icons for contact methods
const MailIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const PhoneIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

const LocationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const contactData = {
  headquarters: {
    name: "SportsGiri Private Limited",
    address: "F. No. 302/B, IDA Cross Road Mall, Indore, Madhya Pradesh, India, Pin- 452010",
    cin: "U92410MP2021PTC058310",
    tin: "BPLS25930C",
  },
  contacts: [
    {
      name: "GSL WhatsApp",
      icon: <WhatsAppIcon />,
      value: "+91 84483 31007",
      link: "https://wa.me/918448331007",
      type: "whatsapp",
    },
    {
      name: "Corporate Telephone",
      icon: <PhoneIcon />,
      value: "+91 74098 83594",
      link: "tel:+917409883594",
      type: "phone",
    },
    {
      name: "Membership Desk",
      icon: <PhoneIcon />,
      value: "+91 96384 13900",
      link: "tel:+919638413900",
      type: "digital",
    },
    {
      name: "Official Email",
      icon: <MailIcon />,
      value: "admin@sportsgiri.com",
      link: "mailto:admin@sportsgiri.com",
      type: "email",
    },
  ],
  googleMapEmbed: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d14725.432661541994!2d75.86562003067783!3d22.719513421949723!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3962fd0b7a0ac7e7%3A0x96d528b1c7e3a3d1!2sIDA%20Scheme%20No.140%2C%20Indore%2C%20Madhya%20Pradesh%20452010!5e0!3m2!1sen!2sin!4v1711858035134!5m2!1sen!2sin",
};

const ContactUs: React.FC = () => {
  return (
    <Layout>
      <div className="bg-white min-h-screen">
        {/* Header - White Background / Blue Text */}
        <header className="bg-white border-b border-gray-100 py-12 text-center">
          <div className="max-w-7xl mx-auto px-4">
            <h1 className="text-4xl md:text-6xl font-black text-[#1d4ed8] uppercase tracking-tighter">
              GET IN <span className="text-[#ff6b6b]">TOUCH</span>
            </h1>
            <div className="w-20 h-1.5 bg-[#ff6b6b] mx-auto mt-4"></div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          {/* Headquarters Section */}
          <section className="mb-16 bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 overflow-hidden">
            <div className="p-8 md:p-12">
              <h2 className="text-2xl font-black text-[#0f172a] mb-8 uppercase tracking-tight flex items-center gap-3">
                <span className="bg-[#1d4ed8] p-2 rounded-xl text-white">
                  <LocationIcon />
                </span>
                Corporate Headquarter
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div>
                  <p className="text-xl font-bold text-[#1d4ed8] mb-4">
                    {contactData.headquarters.name}
                  </p>
                  <p className="text-gray-500 text-lg leading-relaxed font-medium">
                    {contactData.headquarters.address}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">CIN Number</span>
                    <p className="font-bold text-[#0f172a]">{contactData.headquarters.cin}</p>
                  </div>
                  <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">TIN Number</span>
                    <p className="font-bold text-[#0f172a]">{contactData.headquarters.tin}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information Grid */}
          <section className="mb-16">
            <h2 className="text-2xl font-black text-[#0f172a] mb-10 uppercase tracking-tight text-center">
              Direct <span className="text-[#ff6b6b]">Communication</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {contactData.contacts.map((contact, index) => (
                <a
                  key={index}
                  href={contact.link}
                  target={contact.type === "email" || contact.type === "whatsapp" ? "_blank" : "_self"}
                  rel="noopener noreferrer"
                  className="group bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-[#1d4ed8]/20 transition-all duration-300"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${
                    contact.type === "whatsapp" ? "bg-green-50 text-green-600" :
                    contact.type === "phone" ? "bg-[#1d4ed8]/10 text-[#1d4ed8]" :
                    contact.type === "digital" ? "bg-red-50 text-[#ff6b6b]" : "bg-red-50 text-red-600"
                  }`}>
                    {contact.icon}
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                    {contact.name}
                  </p>
                  <p className={`text-sm font-black break-words ${
                    contact.type === "whatsapp" ? "text-green-600" :
                    contact.type === "phone" ? "text-[#1d4ed8]" :
                    contact.type === "digital" ? "text-[#ff6b6b]" : "text-red-600"
                  }`}>
                    {contact.value}
                  </p>
                </a>
              ))}
            </div>
          </section>

          {/* Google Map Section */}
          <section className="bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <h2 className="text-2xl font-black text-[#0f172a] uppercase tracking-tighter">
                Find <span className="text-[#1d4ed8]">Us</span>
              </h2>
              <span className="text-[10px] font-black text-[#ff6b6b] uppercase tracking-widest px-4 py-1 bg-red-50 rounded-full">Indore, India</span>
            </div>
            <div className="w-full h-[500px] grayscale hover:grayscale-0 transition-all duration-700">
              <iframe
                src={contactData.googleMapEmbed}
                className="w-full h-full border-0"
                allowFullScreen={true}
                loading="lazy"
                title="Google Maps Location"
              ></iframe>
            </div>
          </section>
        </main>
      </div>
    </Layout>
  );
};

export default ContactUs;
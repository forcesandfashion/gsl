import React, { useState } from "react";
import {
  Instagram,
  Youtube,
  MessageCircle,
  Mail,
  MapPin,
  Phone,
  LinkedinIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { FaTelegram } from "react-icons/fa";

const Footer = () => {
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);

  const socialLinks = [
    {
      icon: <Instagram className="w-6 h-6" />,
      href: "https://instagram.com/thegsltv",
      name: "Instagram",
    },
    {
      icon: <Youtube className="w-6 h-6" />,
      href: "https://youtube.com/@theglobalshootingleague",
      name: "YouTube",
    },
    {
      icon: <LinkedinIcon className="w-6 h-6" />,
      href: "https://www.linkedin.com/company/thegsltv/",
      name: "LinkedIn",
    },
    {
      icon: <FaTelegram className="w-6 h-6" />,
      href: "https://t.me/thegsltv",
      name: "Telegram",
    },
  ];

  const toggleChatbot = () => {
    setIsChatbotOpen(!isChatbotOpen);
  };

  return (
    /* Changed background to a deep patriotic blue consistent with the theme */
    <footer className="bg-[#000000] text-white py-12 relative border-t-4 border-[#ff6b6b]">
      <div className="max-w-6xl mx-auto px-4">
        {/* Main Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* About GSL */}
          <div>
            <h4 className="font-black text-xl mb-4 uppercase tracking-tighter text-[#ff6b6b]">
              Global Shooting League
            </h4>
            <p className="text-white text-sm leading-relaxed">
              Promoting excellence in shooting sports worldwide. Connecting
              athletes, fans, and enthusiasts through innovative digital
              platforms.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-[#ff6b6b] uppercase tracking-widest text-sm">Quick Links</h4>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <Link to="/about" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/squad" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  Squad
                </Link>
              </li>
              <li>
                <Link to="/shop" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  Shop
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  Events
                </Link>
              </li>
              <li>
                <Link to="/media" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  Media
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-[#ff6b6b] uppercase tracking-widest text-sm">Legal</h4>
            <ul className="space-y-2 text-sm font-medium">
              <li>
                <Link to="/terms" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/refund" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  Refund
                </Link>
              </li>
              <li>
                <Link to="/cancellation" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  Cancellation
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-gray hover:text-[#ff6b6b] transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Information */}
          <div>
            <h4 className="font-bold text-lg mb-4 text-[#ff6b6b] uppercase tracking-widest text-sm">Contact Us</h4>
            <address className="text-gray text-sm not-italic space-y-3">
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-[#ff6b6b] shrink-0" />
                <span>SportsGiri Pvt Ltd, Indore, MP, India</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-[#ff6b6b] shrink-0" />
                <span>+91 74098 83594</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="w-5 h-5 text-[#ff6b6b] shrink-0" />
                <span>admin@sportsgiri.com</span>
              </div>
            </address>
          </div>
        </div>

        {/* Social Media and Copyright */}
        <div className="border-t border-red-800 pt-8 flex flex-col md:flex-row justify-between items-center">
          {/* Copyright */}
          <p className="text-white text-xs font-bold uppercase tracking-widest mb-4 md:mb-0">
            © {new Date().getFullYear()} SportsGiri Pvt Ltd. All Rights
            Reserved.
          </p>

          {/* Social Media Links */}
          <div className="flex space-x-6">
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:text-[#ff6b6b] transition-all transform hover:scale-110"
                aria-label={social.name}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Chatbot Icon - Kept Red consistent with theme */}
      <div
        className="fixed bottom-6 right-6 z-50 bg-[#ff6b6b] text-white rounded-full p-4 shadow-[0_10px_25px_rgba(255,107,107,0.5)] cursor-pointer hover:bg-[#fa5252] transition-all transform hover:scale-110"
        onClick={toggleChatbot}
      >
        <MessageCircle className="w-7 h-7" />
      </div>

      {/* Chatbot Modal */}
      {isChatbotOpen && (
        <div className="fixed bottom-24 right-6 w-80 bg-white text-black rounded-2xl shadow-2xl overflow-hidden z-50 border border-gray-100">
          <div className="bg-[#1d4ed8] p-4 text-white font-black uppercase tracking-tighter">
            SportsGiri Support
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 leading-relaxed">
              How can I help you today? Feel free to ask any questions about our
              league, events, or services.
            </p>
            <button
              className="mt-4 w-full bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-bold py-3 rounded-xl transition-colors uppercase tracking-widest text-xs"
              onClick={toggleChatbot}
            >
              Start Chat
            </button>
          </div>
        </div>
      )}
    </footer>
  );
};

export default Footer;
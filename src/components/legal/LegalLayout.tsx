import React from "react";
import { Link, useLocation } from "react-router-dom";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    to: "/terms",
    label: "Terms & Conditions",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: "/privacy",
    label: "Privacy Policy",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    to: "/refund",
    label: "Refund Policy",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
    {
    to: "/cancellation",
    label: "Cancellation",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
];

interface LegalLayoutProps {
  children: React.ReactNode;
}

// useLocation() replaces the manual `currentPath` prop —
// React Router tracks the active path automatically.
export default function LegalLayout({ children }: LegalLayoutProps) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-[#0a0c10] text-white font-['Sora',sans-serif]">
      {/* ── Top Bar ── */}
      <header className="border-b border-white/10 bg-[#0a0c10]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo — Link to="/..." (react-router-dom syntax) */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#F5C518] flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0a0c10"
                strokeWidth="2.5"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
                <line x1="12" y1="2" x2="12" y2="5" />
                <line x1="12" y1="19" x2="12" y2="22" />
                <line x1="2" y1="12" x2="5" y2="12" />
                <line x1="19" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">
              <span className="text-[#D4AF37]">GSL</span>
              <span className="text-white/70 font-light ml-1">Legal</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}               // ← `to` prop, not `href`
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
                      : "text-white/50 hover:text-white/90 hover:bg-white/5"
                  }`}
                >
                  <span className={isActive ? "text-[#D4AF37]" : "text-white/40"}>
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Mobile nav — icon-only */}
          <div className="flex md:hidden items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  title={item.label}
                  className={`p-2 rounded-lg transition-all ${
                    isActive
                      ? "bg-[#D4AF37]/15 text-[#D4AF37]"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {item.icon}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main>{children}</main>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 mt-24 py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/30 text-sm">
            © {new Date().getFullYear()} Global Shooting League. All rights reserved.
          </p>

          <div className="flex items-center gap-6 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-white/30 hover:text-[#D4AF37] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          <p className="text-white/20 text-xs">
            Contact:{" "}
            <a
              href="mailto:admin@sportsgiri.com"
              className="text-[#D4AF37]/60 hover:text-[#D4AF37] transition-colors"
            >
              admin@sportsgiri.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

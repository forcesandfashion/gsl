import React from "react";

interface SectionCardProps {
  number?: string | number;
  title: string;
  children: React.ReactNode;
  accent?: boolean;
}

export function SectionCard({ number, title, children, accent = false }: SectionCardProps) {
  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-300 hover:border-[#D4AF37]/40 ${
        accent
          ? "bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/30"
          : "bg-white/[0.03] border-white/10 hover:bg-white/[0.05]"
      }`}
    >
      <div className="p-6 md:p-8">
        <div className="flex items-start gap-4">
          {number !== undefined && (
            <span
              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold mt-0.5 ${
                accent
                  ? "bg-[#D4AF37] text-[#0a0c10]"
                  : "bg-[#D4AF37]/15 text-[#D4AF37] group-hover:bg-[#D4AF37]/25 transition-colors"
              }`}
            >
              {number}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className={`text-base font-semibold mb-3 ${accent ? "text-[#D4AF37]" : "text-white/90"}`}>
              {title}
            </h3>
            <div className="text-[15px] text-white/55 leading-relaxed space-y-2">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface BulletListProps {
  items: string[];
}

export function BulletList({ items }: BulletListProps) {
  return (
    <ul className="space-y-2 mt-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#D4AF37]/60 mt-2" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

interface PageHeroProps {
  badge: string;
  title: string;
  subtitle: string;
  lastUpdated?: string;
  icon: React.ReactNode;
}

export function PageHero({ badge, title, subtitle, lastUpdated, icon }: PageHeroProps) {
  return (
    <div className="relative overflow-hidden border-b border-white/10">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/5 rounded-full blur-[120px]" />
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-[#D4AF37]/3 rounded-full blur-[80px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(212,175,55,0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(212,175,55,0.5) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
              {icon}
            </div>
            <span className="text-xs font-semibold tracking-widest text-[#D4AF37]/80 uppercase">{badge}</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            <span className="text-white">{title.split(" ")[0]} </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F5C518]">
              {title.split(" ").slice(1).join(" ")}
            </span>
          </h1>

          <p className="text-white/50 text-lg leading-relaxed mb-6">{subtitle}</p>

          {lastUpdated && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/40">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Last Updated: {lastUpdated}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ContactBannerProps {
  email: string;
  label: string;
}

export function ContactBanner({ email, label }: ContactBannerProps) {
  return (
    <div className="mt-10 rounded-2xl bg-gradient-to-br from-[#D4AF37]/10 via-[#D4AF37]/5 to-transparent border border-[#D4AF37]/25 p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <p className="text-white/70 font-medium mb-1">{label}</p>
        <p className="text-white/40 text-sm">Our team typically responds within 5 business days.</p>
      </div>
      <a
        href={`mailto:${email}`}
        className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D4AF37] text-[#0a0c10] font-semibold text-sm hover:bg-[#F5C518] transition-colors"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
        {email}
      </a>
    </div>
  );
}

import React from "react";
import LegalLayout from "../legal/LegalLayout";
import { PageHero,BulletList, ContactBanner } from "../legal/LegalComponents";

interface PolicySectionProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function PolicySection({ icon, title, children }: PolicySectionProps) {
  return (
    <div className="group rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] hover:border-[#D4AF37]/30 transition-all duration-300 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37]/25 transition-colors">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-white/90">{title}</h3>
      </div>
      <div className="text-[15px] text-white/55 leading-relaxed">{children}</div>
    </div>
  );
}

export default function PrivacyPage() {
  return (
    <LegalLayout>
      <PageHero
        badge="Privacy & Data"
        title="Privacy Policy"
        subtitle="Global Shooting League is committed to protecting your personal information. This policy explains what data we collect, how we use it, and your rights as a user."
        lastUpdated="Review Pending"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Commitment banner */}
        <div className="mb-12 rounded-2xl bg-gradient-to-r from-[#D4AF37]/10 via-transparent to-transparent border border-[#D4AF37]/20 p-6 flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-[#D4AF37]/15 flex items-center justify-center text-[#D4AF37]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-[#D4AF37] font-semibold mb-1">Our Commitment to You</p>
            <p className="text-white/50 text-sm">
              We do not sell your personal data. Your privacy is fundamental to how we build and operate GSL.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PolicySection
            title="Information We Collect"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
            }
          >
            <BulletList
              items={[
                "Account details — name, email, date of birth, password (hashed)",
                "Profile information — discipline, skill level, training preferences",
                "Payment details — processed securely via third-party; no card data stored by us",
                "Usage & device data — collected automatically to improve performance",
              ]}
            />
          </PolicySection>

          <PolicySection
            title="How We Use Your Data"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
            }
          >
            <BulletList
              items={[
                "Platform operations and service delivery",
                "AI coaching personalisation and performance insights",
                "Secure payment processing and billing",
                "Push notifications and important announcements",
                "Continuous app improvement and bug resolution",
              ]}
            />
          </PolicySection>

          <PolicySection
            title="Data Disclosure"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          >
            <p>
              We do <strong className="text-white/80">not sell</strong> any of your personal information. Data is disclosed only to:
            </p>
            <BulletList
              items={[
                "Selected service providers who assist in platform operations",
                "Legal authorities when required by applicable law",
                "No advertising or data brokerage partners — ever",
              ]}
            />
          </PolicySection>

          <PolicySection
            title="Data Retention & Deletion"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            }
          >
            <p className="mb-3">
              We retain your information for as long as your account is active or as needed to provide services.
            </p>
            <p>
              Request full deletion at any time by emailing{" "}
              <a href="mailto:admin@sportsgiri.com" className="text-[#D4AF37] hover:underline">
                admin@sportsgiri.com
              </a>
              . Requests are processed within 30 days.
            </p>
          </PolicySection>

          <PolicySection
            title="Your Rights"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            }
          >
            <p className="mb-3">You have full rights over your personal data:</p>
            <BulletList
              items={[
                "Access — request a copy of all data we hold about you",
                "Amend — correct any inaccurate or incomplete information",
                "Delete — request permanent removal of your data",
                "Restrict — limit how we process certain types of data",
              ]}
            />
          </PolicySection>

          <PolicySection
            title="Security Measures"
            icon={
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            }
          >
            <p className="mb-3">We implement industry-standard protections including:</p>
            <BulletList
              items={[
                "End-to-end encryption for data in transit (TLS 1.3)",
                "Encrypted storage on secure, access-controlled servers",
                "Regular security audits and vulnerability assessments",
                "We recommend using a unique, strong password for your account",
              ]}
            />
          </PolicySection>
        </div>

        {/* Cookies & Minors */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
            <h3 className="text-base font-semibold text-white/90 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#D4AF37]" />
              Cookies
            </h3>
            <p className="text-[15px] text-white/55 leading-relaxed">
              We use cookies and similar tracking technologies to enhance your experience, remember preferences,
              and analyse usage patterns to improve our services.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-6 md:p-8">
            <h3 className="text-base font-semibold text-amber-400 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              Age Restriction
            </h3>
            <p className="text-[15px] text-white/55 leading-relaxed">
              Our application is intended for adults only. Users under the age of 13 should not access GSL.
              If we discover a user is under 13, their account will be immediately removed.
            </p>
          </div>
        </div>

        <ContactBanner email="admin@sportsgiri.com" label="Privacy questions or data requests?" />
      </div>
    </LegalLayout>
  );
}

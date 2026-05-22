import LegalLayout from "../legal/LegalLayout";
import { PageHero,ContactBanner } from "../legal/LegalComponents";

interface StatusCardProps {
  type: "eligible" | "ineligible";
  title: string;
  items: string[];
}

function StatusCard({ type, title, items }: StatusCardProps) {
  const isEligible = type === "eligible";
  return (
    <div
      className={`rounded-2xl border p-6 md:p-8 transition-all duration-300 ${
        isEligible
          ? "bg-emerald-500/8 border-emerald-500/25 hover:border-emerald-500/40"
          : "bg-red-500/8 border-red-500/20 hover:border-red-500/35"
      }`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isEligible ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
          }`}
        >
          {isEligible ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>
        <h3 className={`font-semibold text-base ${isEligible ? "text-emerald-400" : "text-red-400"}`}>{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2.5 text-[15px] text-white/55">
            <span
              className={`flex-shrink-0 w-1.5 h-1.5 rounded-full mt-2 ${
                isEligible ? "bg-emerald-500/60" : "bg-red-500/60"
              }`}
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface StepCardProps {
  step: number;
  total: number;
  title: string;
  description: string;
  detail?: string;
}

function StepCard({ step, total, title, description, detail }: StepCardProps) {
  return (
    <div className="relative flex gap-5">
      {step < total && (
        <div className="absolute left-[19px] top-12 bottom-0 w-px bg-gradient-to-b from-[#D4AF37]/30 to-transparent" />
      )}
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] font-bold text-sm z-10">
        {step}
      </div>
      <div className="pb-8">
        <h4 className="text-white/90 font-semibold mb-1">{title}</h4>
        <p className="text-[15px] text-white/55 leading-relaxed">{description}</p>
        {detail && (
          <p className="mt-2 text-sm text-[#D4AF37]/70 bg-[#D4AF37]/8 border border-[#D4AF37]/20 rounded-lg px-3 py-2 inline-block">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

const steps = [
  {
    title: "Send a Refund Request Email",
    description:
      "Email admin@sportsgiri.com with the subject line 'Refund Request'. Include your registered email, purchase date, and a clear reason.",
    detail: "Subject: Refund Request",
  },
  {
    title: "Our Team Reviews Your Request",
    description:
      "We review all requests within 5 business days. We may reach out for additional verification if required.",
    detail: "Response time: within 5 business days",
  },
  {
    title: "Refund Processed to Original Method",
    description:
      "Approved refunds are returned to your original payment method. Processing time depends on your bank or card provider.",
    detail: "Processing: 7–10 business days after approval",
  },
];

export default function RefundPage() {
  return (
    <LegalLayout>
      <PageHero
        badge="Billing & Refunds"
        title="Refund Policy"
        subtitle="We want you to be fully satisfied with your GSL experience. Read this policy carefully before making a purchase to understand your rights and options."
        lastUpdated="Review Pending"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Plans */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: "Free Trial", icon: "🎯", desc: "No charges until trial ends. Cancel anytime at zero cost.", highlight: true },
            { label: "Monthly Plan", icon: "📅", desc: "Billed each month. Cancel before renewal to avoid next charge.", highlight: false },
            { label: "Annual Plan", icon: "🏆", desc: "Best value. Billed annually and auto-renews unless cancelled.", highlight: false },
          ].map((plan, i) => (
            <div
              key={i}
              className={`rounded-2xl border p-6 text-center transition-all duration-300 ${
                plan.highlight
                  ? "bg-[#D4AF37]/10 border-[#D4AF37]/35 hover:border-[#D4AF37]/55"
                  : "bg-white/[0.03] border-white/10 hover:border-white/20"
              }`}
            >
              <div className="text-3xl mb-3">{plan.icon}</div>
              <h3 className={`font-semibold mb-2 ${plan.highlight ? "text-[#D4AF37]" : "text-white/90"}`}>
                {plan.label}
              </h3>
              <p className="text-sm text-white/50 leading-relaxed">{plan.desc}</p>
            </div>
          ))}
        </div>

        {/* Eligibility */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white/90 mb-2">Refund Eligibility</h2>
          <p className="text-white/40 text-sm mb-5">Understand what qualifies for a refund and what does not.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusCard
              type="eligible"
              title="Eligible for Refund"
              items={[
                "You were charged in error due to a billing system fault",
                "You didn't use the app and contact us within 7 days of the charge",
                "A verified technical issue blocked your access for a significant period",
              ]}
            />
            <StatusCard
              type="ineligible"
              title="Not Eligible for Refund"
              items={[
                "Change of mind after accessing or using any content",
                "Partial usage or missed cancellation before auto-renewal date",
                "Third-party purchases via Apple App Store or Google Play — contact those platforms directly",
              ]}
            />
          </div>
        </div>

        {/* Process */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-10">
          <h2 className="text-xl font-bold text-white/90 mb-2">How to Request a Refund</h2>
          <p className="text-white/40 text-sm mb-8">Follow these steps to submit your refund request.</p>
          {steps.map((s, i) => (
            <StepCard key={i} step={i + 1} total={steps.length} title={s.title} description={s.description} detail={s.detail} />
          ))}
        </div>

        {/* Timeline */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h3 className="text-base font-semibold text-white/90 mb-6">Refund Timeline at a Glance</h3>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {[
              { label: "Submit Request", time: "Day 0", color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/15 border-[#D4AF37]/30" },
              { label: "Review Period", time: "Up to 5 days", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
              { label: "Decision", time: "Day 5", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" },
              { label: "Payment Returned", time: "7–10 days", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
            ].map((item, i, arr) => (
              <div key={i} className="flex md:flex-col items-center gap-3 md:gap-2 flex-1">
                <div className={`rounded-xl border px-3 py-2 text-center min-w-[120px] md:min-w-0 ${item.bg}`}>
                  <p className={`font-semibold text-sm ${item.color}`}>{item.label}</p>
                  <p className="text-xs text-white/40 mt-0.5">{item.time}</p>
                </div>
                {i < arr.length - 1 && (
                  <div className="hidden md:block flex-1 h-px bg-gradient-to-r from-white/20 to-white/10 relative">
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/20" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <ContactBanner email="admin@sportsgiri.com" label="Need to request a refund?" />
      </div>
    </LegalLayout>
  );
}

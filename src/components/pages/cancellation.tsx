import LegalLayout from "../legal/LegalLayout";
import { PageHero, ContactBanner } from "../legal/LegalComponents";

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

const cancellationSteps = [
  {
    title: "Send a Cancellation Request",
    description:
      "Email admin@sportsgiri.com with the subject line 'Cancellation Request'. Include your registered email address and the plan you wish to cancel (Monthly / Annual).",
    detail: "Subject: Cancellation Request",
  },
  {
    title: "Confirmation & Access Continuation",
    description:
      "We will confirm your cancellation within 2–3 business days. Your access continues until the end of the current billing cycle – no further charges will be made.",
    detail: "No refund for the remaining period unless you qualify (see eligibility below).",
  },
  {
    title: "Refund (if eligible)",
    description:
      "If your cancellation meets the refund criteria, we will process the refund to your original payment method within 7–10 business days after approval.",
    detail: "Refund timeline: 7–10 business days after approval",
  },
];

export default function CancellationPage() {
  return (
    <LegalLayout>
      <PageHero
        badge="Cancellation & Billing"
        title="Cancellation Policy"
        subtitle="Clear, fair rules for cancelling your GSL subscription. Read this policy to understand your rights, auto-renewal terms, and when a refund may be issued – as per Indian consumer laws."
        lastUpdated="Review Pending"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Plans – Cancellation & Auto-renewal */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              label: "Free Trial",
              icon: "🎯",
              desc: "No charges until trial ends. Cancel anytime before the trial ends – you will not be billed.",
              highlight: true,
            },
            {
              label: "Monthly Plan",
              icon: "📅",
              desc: "Auto-renews every month. Cancel before the next renewal date to avoid future charges. No refund for the current month.",
              highlight: false,
            },
            {
              label: "Annual Plan",
              icon: "🏆",
              desc: "Best value – auto-renews yearly. Cancel before renewal; no refund for the unused portion unless covered under eligible reasons.",
              highlight: false,
            },
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

        {/* Refund Eligibility (upon cancellation or as a separate request) */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white/90 mb-2">Refund Eligibility Upon Cancellation</h2>
          <p className="text-white/40 text-sm mb-5">
            Under Indian law, you are not automatically entitled to a refund for unused subscription periods. However, we offer refunds in the following cases.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatusCard
              type="eligible"
              title="Eligible for Refund"
              items={[
                "You were charged in error due to a billing system fault (e.g., duplicate charge).",
                "You did not use the service and contact us within 7 days of the first charge (discretionary cooling-off).",
                "A verified technical issue prevented access for a significant period, and you cancelled within 15 days of the issue.",
                "We failed to provide a reminder notice before auto-renewal as required by RBI guidelines.",
              ]}
            />
            <StatusCard
              type="ineligible"
              title="Not Eligible for Refund"
              items={[
                "Change of mind after accessing or using any content or features.",
                "Partial usage or missed cancellation before the auto-renewal date.",
                "Purchases made via Apple App Store or Google Play – please contact those platforms directly (their refund policies apply).",
                "Cancelling a monthly/annual plan mid-cycle (access continues until the end of the period, but no partial refund).",
              ]}
            />
          </div>
        </div>

        {/* Cancellation & Refund Process */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-10">
          <h2 className="text-xl font-bold text-white/90 mb-2">How to Cancel Your Subscription</h2>
          <p className="text-white/40 text-sm mb-8">
            Follow these steps to cancel. If you also believe you qualify for a refund, the same process applies – we will review refund eligibility after cancellation.
          </p>
          {cancellationSteps.map((s, i) => (
            <StepCard
              key={i}
              step={i + 1}
              total={cancellationSteps.length}
              title={s.title}
              description={s.description}
              detail={s.detail}
            />
          ))}
        </div>

        {/* Timeline – Cancellation + Refund */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
          <h3 className="text-base font-semibold text-white/90 mb-6">Cancellation & Refund Timeline</h3>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {[
              { label: "Submit Cancellation", time: "Day 0", color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/15 border-[#D4AF37]/30" },
              { label: "Confirmation", time: "2–3 days", color: "text-blue-400", bg: "bg-blue-500/15 border-blue-500/30" },
              { label: "Refund Review (if eligible)", time: "Up to 5 days", color: "text-purple-400", bg: "bg-purple-500/15 border-purple-500/30" },
              { label: "Refund Processed", time: "7–10 days", color: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30" },
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
          <p className="text-xs text-white/30 mt-6">
            *Refunds, if approved, are issued to the original payment method. Processing time depends on your bank or card issuer.
          </p>
        </div>

        <ContactBanner email="admin@sportsgiri.com" label="Need to cancel your subscription or request a refund?" />
      </div>
    </LegalLayout>
  );
}
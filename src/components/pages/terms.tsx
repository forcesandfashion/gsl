import LegalLayout from "../legal/LegalLayout";
import { SectionCard, PageHero, ContactBanner } from "../legal/LegalComponents";

const terms = [
  {
    title: "Use of the App",
    content:
      "GSL shall be used for personal use only. Unauthorized use, any attempt at hacking, and credential sharing will lead to immediate account termination without refund.",
  },
  {
    title: "Account Management",
    content:
      "It is your responsibility to safeguard your login credentials. You are solely responsible for all activities conducted through your account. Notify us immediately of any unauthorized access.",
  },
  {
    title: "Intellectual Property Rights",
    content:
      "GSL retains all rights to its material, including but not limited to training content, AI models, video assets, and platform design. Any unauthorized use or distribution is strictly forbidden.",
  },
  {
    title: "User Submissions",
    content:
      "The content you post belongs to you, but by posting, you grant GSL a non-exclusive license to use the content for improving its service, training AI models, and platform development.",
  },
  {
    title: "Privacy",
    content:
      "GSL handles your information as per the GSL Privacy Policy. Your data will never be sold to any third party. Please review our Privacy Policy for full details on data handling.",
  },
  {
    title: "Payment and Subscription Services",
    content:
      "GSL offers premium services for a fee. Subscription plans will automatically renew at the end of each billing period unless you cancel before the renewal date through your account settings.",
  },
  {
    title: "Third Party Websites",
    content:
      "GSL does not take responsibility for any third-party websites that may be linked to within the platform. Access external links at your own discretion and risk.",
  },
  {
    title: "Disclaimers and Safeguards",
    content:
      "GSL provides information for educational and training purposes only. Users must follow all applicable local laws and regulations, and receive proper professional instruction before engaging in shooting sports.",
  },
  {
    title: "Disclaimer of Liability",
    content:
      "GSL shall not be held liable for any indirect, incidental, special, or consequential damages incurred through the use of the Application, including but not limited to loss of data or profits.",
  },
  {
    title: "Indemnification",
    content:
      "You agree to indemnify, defend, and hold GSL and its officers harmless from any claims, damages, or expenses arising from your use of the Application or violation of these Terms.",
  },
  {
    title: "Termination",
    content:
      "GSL may revoke access to the Application at any time for violations of these Terms. Access terminates immediately upon revocation with no obligation for refund unless otherwise required by law.",
  },
  {
    title: "Modification of Agreement",
    content:
      "GSL may update its Terms of Service at any time without prior notice. Your continued use of the Application constitutes acceptance of any modified Terms.",
  },
  {
    title: "Governing Law",
    content:
      "These Terms of Service are governed by and construed in accordance with the laws of the applicable jurisdiction. Any disputes shall be resolved through binding arbitration.",
  },
];

export default function TermsPage() {
  return (
    <LegalLayout>
      <PageHero
        badge="Legal Document"
        title="Terms & Conditions"
        subtitle="Please read these terms carefully before using the Global Shooting League application. By using the app, you agree to be bound by these terms."
        lastUpdated="Review Pending"
        icon={
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        }
      />

      <div className="max-w-7xl mx-auto px-6 py-14">
        {/* Acceptance banner */}
        <div className="mb-12 flex items-start gap-4 p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <div>
            <p className="text-amber-400 font-semibold text-sm mb-1">Important Notice</p>
            <p className="text-white/50 text-sm leading-relaxed">
              By downloading, installing, or using the GSL application, you acknowledge that you have read,
              understood, and agree to be bound by all of the following terms and conditions.
            </p>
          </div>
        </div>

        {/* Terms grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {terms.map((term, index) => (
            <SectionCard key={index} number={index + 1} title={term.title}>
              <p>{term.content}</p>
            </SectionCard>
          ))}
        </div>

        <ContactBanner email="admin@sportsgiri.com" label="Questions about our Terms?" />
      </div>
    </LegalLayout>
  );
}

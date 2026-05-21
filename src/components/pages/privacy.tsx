// import Layout from "./Layout";

// export default function PrivacyPage() {
//   return (
//     <div className="min-h-screen bg-white text-black">
//       <Layout>
//         <main className="pt-16">
//           <section className="py-20 bg-blue-700 text-white">
//             <div className="max-w-6xl mx-auto px-4 text-center">
//               <h1 className="text-4xl md:text-5xl font-bold mb-6">
//                 Privacy Policy
//               </h1>
//             </div>
//           </section>
//           <section className="py-16 bg-white">
//             <div className="max-w-4xl mx-auto px-4">
//               <h2 className="text-2xl font-bold mb-6">Our Commitment to Your Privacy</h2>
//               <p className="text-gray-700 mb-4">
//                 Global Shooting League (GSL), powered by SportsGiri Private Limited, is committed to protecting the privacy and personal data of all users interacting with our website and mobile platforms. We collect only the information necessary to provide a seamless and personalized user experience, including for purposes of registration, communication, service enhancement, and analytics.
//               </p>
//               <p className="text-gray-700 mb-4">
//                 All personal data is handled with the highest standards of confidentiality and stored securely in compliance with applicable data protection laws. We do not sell, rent, or disclose your information to third parties without your explicit consent, unless required by law or for essential service delivery by trusted partners operating under strict confidentiality agreements.
//               </p>
//               <p className="text-gray-700 mb-4">
//                 By accessing and using our platform, you consent to the terms outlined in this Privacy Policy. Should you have any questions or require further clarification, please contact us at <a href="mailto:admin@sportsgiri.com" className="text-blue-700 underline">admin@sportsgiri.com</a>.
//               </p>
//             </div>
//           </section>
//         </main>
//       </Layout>
//     </div>
//   );
// } 


"use client";

import { Shield, CheckCircle } from "lucide-react";
import Layout from "./Layout";



export default function PrivacyPolicy() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4 mb-6">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <p className="text-green-800 text-sm">
              SportsGiri Pvt. Ltd. respects your privacy and is committed to protecting your personal data in line with applicable Indian law, including the Digital Personal Data Protection Act (DPDPA). This policy explains how personal data is collected, used, stored, and safeguarded when you interact with the Site and services.
            </p>
          </div>
        </div>

        {[
          {
            title: "1. Information We Collect",
            content: (
              <>
                <p className="mb-3">SprotsGiri Pvt. Ltd. (SportsGiri Pvt. Ltd.) may collect the following categories of personal information:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                    <span><strong>Contact details:</strong> name, email, phone, organization, role, and address</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                    <span><strong>Application info:</strong> startup details, sector, stage, pitch decks, professional background</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                    <span><strong>Transaction data:</strong> registrations, payments, event participation, interactions</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                    <span><strong>Technical data:</strong> IP address, browser type, device identifiers, usage analytics</span>
                  </li>
                </ul>
              </>
            )
          },
          {
            title: "2. How We Use Your Information",
            content: (
              <ul className="space-y-2">
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Process applications, registrations, and payments for programs, events, and services</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Communicate regarding program updates, opportunities, events, and relevant information</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Improve the Site, tailor offerings, and conduct research, analytics, and reporting</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Comply with legal obligations, respond to lawful requests, and prevent fraud</span>
                </li>
              </ul>
            )
          },
          {
            title: "3. Legal Basis and Consent",
            content: "Where required, SportsGiri Pvt. Ltd. will obtain your consent before collecting or using personal data for specific purposes such as marketing communications. You may withdraw consent at any time by using the unsubscribe mechanisms provided in communications or by contacting the team; withdrawal of consent may limit access to some services."
          },
          {
            title: "4. Sharing of Information",
            content: "SportsGiri Pvt. Ltd. may share limited personal data with trusted partners, mentors, service providers, or sponsors strictly for the purpose of delivering programs or services, under appropriate confidentiality and data‑protection obligations. Data may be disclosed where required by law, regulation, court order, or government authority."
          },
          {
            title: "5. Data Security and Retention",
            content: "Reasonable technical and organizational measures are implemented to protect personal data against unauthorized access, alteration, disclosure, or destruction. Data is retained only for as long as necessary to fulfil the purposes described in this policy or as required by applicable law, after which it is securely deleted or anonymized."
          },
          {
            title: "6. Your Rights",
            content: (
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Request access to the personal data held about you</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Request correction or updating of inaccurate or incomplete data</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Request deletion or restriction of processing of your data, where feasible</span>
                </li>
                <li className="flex items-start">
                  <Shield className="w-4 h-4 text-green-600 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Object to certain types of processing, including direct marketing</span>
                </li>
              </ul>
            )
          },
          {
            title: "7. Cookies and Tracking Technologies",
            content: "The Site may use cookies and similar technologies to enhance user experience, analyze traffic, and understand usage patterns. You can manage cookie preferences through your browser settings; however, disabling certain cookies may impact some Site features."
          },
          {
            title: "8. Updates to this Policy",
            content: "This Privacy Policy may be updated periodically to reflect changes in law, technology, or SportsGiri Pvt. Ltd.'s practices. The latest version will always be available on the Site, and continued use of the Site after changes indicates acceptance of the updated policy."
          }
        ].map((item, index) => (
          <div key={index} className="border-l-4 border-green-200 pl-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{item.title}</h3>
            <div className="text-gray-700 leading-relaxed">
              {item.content}
            </div>
          </div>
        ))}
      </div>
    </Layout>
  );
}
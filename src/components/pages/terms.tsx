// import Layout from "./Layout";

// export default function TermsPage() {
//   return (
//     <div className="min-h-screen bg-white text-black">
//       <Layout>
//         <main className="pt-16">
//           <section className="py-20 bg-blue-700 text-white">
//             <div className="max-w-6xl mx-auto px-4 text-center">
//               <h1 className="text-4xl md:text-5xl font-bold mb-6">
//                 Terms & Conditions
//               </h1>
//             </div>
//           </section>
//           <section className="py-16 bg-white">
//             <div className="max-w-4xl mx-auto px-4">
//               <h2 className="text-2xl font-bold mb-6">Terms and Conditions</h2>
//               <div className="text-gray-700 mb-4 text-justify">
//                 <p className="mb-4">
//                   By accessing and using the Global Shooting League (GSL) website and mobile applications, you agree to comply with the following terms and conditions. Please read them carefully before proceeding.
//                 </p>
//                 <ul className="list-disc pl-6 space-y-4">
//                   <li className="text-justify">
//                     <strong>Acceptance of Terms:</strong> Your use of the GSL platform constitutes your agreement to all applicable terms, policies, and notices outlined here.
//                   </li>
//                   <li className="text-justify">
//                     <strong>Use of Content:</strong> All content, including text, images, videos, graphics, and data on this website, is the intellectual property of SportsGiri Pvt. Ltd. Unauthorized use, reproduction, or distribution is prohibited.
//                   </li>
//                   <li className="text-justify">
//                     <strong>User Conduct:</strong> Users must refrain from any activity that disrupts or interferes with the website's functionality, violates applicable laws, or infringes on the rights of others.
//                   </li>
//                   <li className="text-justify">
//                     <strong>Privacy Policy:</strong> All user data is handled in accordance with our Privacy Policy. By using the site, you consent to the collection and use of information as described therein.
//                   </li>
//                   <li className="text-justify">
//                     <strong>Third-Party Links:</strong> The GSL website may contain links to external sites. We are not responsible for the content or policies of these third-party platforms.
//                   </li>
//                   <li className="text-justify">
//                     <strong>Membership and Accounts:</strong> Registered users must provide accurate information. GSL reserves the right to suspend or terminate accounts that violate these terms or engage in misuse.
//                   </li>
//                   <li className="text-justify">
//                     <strong>Limitation of Liability:</strong> GSL and SportsGiri Pvt. Ltd. shall not be liable for any direct, indirect, or incidental damages resulting from the use or inability to use this website.
//                   </li>
//                   <li className="text-justify">
//                     <strong>Changes to Terms:</strong> We reserve the right to update or modify these Terms & Conditions at any time without prior notice. Continued use of the platform signifies acceptance of any changes.
//                   </li>
//                 </ul>
//               </div>
//               <p className="text-gray-700 mb-4">
//                 For questions or concerns regarding our Terms & Conditions, please contact us at: <a href="mailto:admin@sportsgiri.com" className="text-blue-700 underline">admin@sportsgiri.com</a>
//               </p>
//             </div>
//           </section>
//         </main>
//       </Layout>
//     </div>
//   );
// } 


"use client";

import {  AlertCircle } from "lucide-react";
import Layout from "./Layout";

export default function TermsAndConditions() {
  return (
    <Layout>
      <div className="space-y-6">
        <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-6">
          <p className="text-purple-800 text-sm">
            These Terms and Conditions (&quot;Terms&quot;) govern your access to and use of the SportsGiri Pvt. Ltd. website (the "Site") and all services, programs, and content made available through it. By using the Site, you agree to be bound by these Terms of Nebula Def-SAT Private Limited.
          </p>
        </div>

        {[
          {
            title: "1. Use of the Site",
            content: "The Site is intended for founders, professionals, partners, and stakeholders interested in SportsGiri Pvt. Ltd.'s programs and initiatives. You agree to use the Site only for lawful purposes and in a manner that does not infringe the rights of, restrict, or inhibit the use and enjoyment of the Site by any other user."
          },
          {
            title: "2. Eligibility and Registration",
            content: "Some areas of the Site or certain services may require registration or application. You agree that the information provided during registration or application is accurate, current, and complete, and that you will update it as necessary."
          },
          {
            title: "3. Intellectual Property",
            content: "All content on the Site, including text, graphics, logos, images, videos, program materials, and designs, is owned by or licensed to SportsGiri Pvt. Ltd. and is protected by applicable intellectual property laws. You may view, download, or print limited copies of materials for personal, non‑commercial use only, provided you do not modify the content and retain all proprietary notices."
          },
          {
            title: "4. Prohibited Activities",
            content: (
              <ul className="space-y-2">
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Use the Site to upload or transmit any unlawful, harmful, defamatory, or objectionable material.</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Attempt to gain unauthorized access to the Site, its servers, or any associated systems.</span>
                </li>
                <li className="flex items-start">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <span>Copy, distribute, or exploit any part of the Site or its content for commercial purposes without prior written consent.</span>
                </li>
              </ul>
            )
          },
          {
            title: "5. Third‑Party Links and Services",
            content: "The Site may contain links to third‑party websites or services for convenience and information. SportsGiri Pvt. Ltd. does not endorse and is not responsible for the content, security, or privacy practices of any third‑party websites, and your use of them is at your own risk."
          },
          {
            title: "6. Program and Service Modifications",
            content: "SportsGiri Pvt. Ltd. may modify, update, or discontinue any program, offering, or feature of the Site at any time, with or without notice. Fees, eligibility criteria, and program structures may be revised periodically, and updated details will be reflected on the Site."
          },
          {
            title: "7. Limitation of Liability",
            content: "To the maximum extent permitted by law, SportsGiri Pvt. Ltd. shall not be liable for any direct, indirect, incidental, consequential, or punitive damages arising from your use or inability to use the Site or services. SportsGiri Pvt. Ltd. does not guarantee uninterrupted or error‑free access to the Site and may suspend operations for maintenance or upgrades."
          },
          {
            title: "8. Indemnity",
            content: "You agree to indemnify and hold harmless SportsGiri Pvt. Ltd., its team members, partners, and affiliates from any claims, losses, damages, liabilities, and expenses arising from your breach of these Terms or misuse of the Site."
          },
          {
            title: "9. Changes to these Terms",
            content: "SportsGiri Pvt. Ltd. may revise these Terms from time to time by updating this page. Continued use of the Site after such changes constitutes your acceptance of the revised Terms."
          },
          {
            title: "10. Governing Law and Jurisdiction",
            content: "These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with the Site or these Terms shall be subject to the exclusive jurisdiction of the courts located in India."
          }
        ].map((item, index) => (
          <div key={index} className="border-l-4 border-purple-200 pl-4">
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
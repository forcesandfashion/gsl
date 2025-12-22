import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Star, Building, Users, Globe } from "lucide-react";
import { useAuth } from "@/firebase/auth";
import Layout from "./Layout";
import { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

export default function PricingPage() {
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);

  // PayPal configuration
  const initialOptions = {
    clientId: "YOUR_PAYPAL_CLIENT_ID", // Replace with your PayPal client ID
    currency: "USD",
    intent: "capture",
  };

  // Bank details from the previous component
  const bankDetails = {
    accountName: "Sportsgiri Private Limited",
    // You can add more bank details here if needed
  };

  // Company details from the previous component
  const companyDetails = {
    name: "SportsGiri Private Limited",
    address:
      "F. No. 302/B, IDA Cross Road Mall, Indore, Madhya Pradesh, India, Pin- 452010",
    cin: "U92410MP2021PTC058310",
    pan: "ABHCS2471A",
    tin: "BPLS25930C",
    contacts: [
      { label: "TheGSLTV WhatsApp", value: "+91 84483 31007" },
      { label: "Corporate Telephone", value: "+91 74098 83594" },
      { label: "Membership", value: "+91 96384 13900" },
      { label: "Email", value: "admin@sportsgiri.com" },
    ],
  };

  const handleCardClick = () => {
    setShowPopup(true);
  };

  const createOrder = (data: any, actions: any) => {
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: "99.00", // Replace with your membership price
          },
        },
      ],
    });
  };

  const onApprove = async (data: any, actions: any) => {
    const order = await actions.order.capture();
    console.log("Payment successful!", order);
    // Handle successful payment here
    // You can update user's membership status in your database
  };

  const membershipPlans = [
    {
      name: "Basic",
      subtitle: "Get Recognised, Get Started",
      badge: "Personal Token",
      icon: <Users className="h-8 w-8 text-blue-700" />,
      description: "Perfect for individual shooters and range owners taking their first step into the digital ecosystem.",
      features: [
        "Build visibility and showcase profile",
        "Engage with shooting community",
        "Basic digital presence",
        "Community forum access",
        "Monthly newsletter",
        "Basic support"
      ],
      popular: false,
      bgColor: "bg-white",
      borderColor: "border-gray-200",
      buttonColor: "bg-blue-700 hover:bg-blue-800"
    },
    {
      name: "Pro+",
      subtitle: "Expand Your Reach",
      badge: "Community Token",
      icon: <Star className="h-8 w-8 text-blue-700" />,
      description: "Ideal for those ready to grow their presence and influence in the shooting community.",
      features: [
        "Everything in Basic plan",
        "Connect with broader network",
        "Community-based features",
        "Local collaboration opportunities",
        "Advanced insights & analytics",
        "Priority support"
      ],
      popular: true,
      bgColor: "bg-blue-50",
      borderColor: "border-blue-700 border-2",
      buttonColor: "bg-blue-700 hover:bg-blue-800"
    },
    {
      name: "Enterprise",
      subtitle: "Go Digital",
      badge: "Multi-City / Currency Wallet Token",
      icon: <Building className="h-8 w-8 text-blue-700" />,
      description: "Designed for ranges, academies, and professionals operating across multiple locations.",
      features: [
        "Everything in Pro+ plan",
        "Advanced digital tools",
        "Cross-city integration",
        "Multi-currency wallet support",
        "Scale management operations",
        "Dedicated account manager"
      ],
      popular: false,
      bgColor: "bg-white",
      borderColor: "border-gray-200",
      buttonColor: "bg-blue-700 hover:bg-blue-800"
    },
    {
      name: "Corporate",
      subtitle: "Scale Your Business",
      badge: "Enterprise Token",
      icon: <Globe className="h-8 w-8 text-blue-700" />,
      description: "For organizations looking to establish a comprehensive digital presence.",
      features: [
        "Everything in Enterprise plan",
        "Advanced analytics & reporting",
        "Multi-location management",
        "Priority support & training",
        "Custom integrations",
        "24/7 premium support"
      ],
      popular: false,
      bgColor: "bg-white",
      borderColor: "border-gray-200",
      buttonColor: "bg-blue-700 hover:bg-blue-800"
    }
  ];

  return (
    <PayPalScriptProvider options={initialOptions}>
      <div className="min-h-screen bg-white text-black">
        <Layout>
          <main className="pt-16">
            {/* Hero section */}
            <section className="py-20 bg-[#0f172a] text-white">
              <div className="max-w-6xl mx-auto px-4 text-center">
                <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter">
                  Membership <span className="text-[#ff6b6b]">PLANS</span>
                </h1>
                <div className="text-xl max-w-3xl mx-auto">
                  <p className="mb-4 text-white">
                    Join the Global Shooting League and take your shooting skills to the next level with our comprehensive membership options.
                  </p>
                </div>
              </div>
            </section>

            {/* Pricing Plans */}
            <section className="py-20 bg-gray-50">
              <div className="max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                  {membershipPlans.map((plan, index) => (
                    <div key={index} className={`${plan.borderColor} ${plan.bgColor} rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 relative flex flex-col h-full`}>
                      {plan.popular && (
                        <div className="absolute top-0 right-0 bg-[#fa5252] text-white px-4 py-2 text-sm font-semibold rounded-bl-xl shadow-lg">
                          <Star className="inline h-4 w-4 mr-1" />
                          Most Popular
                        </div>
                      )}
                      
                      <div className="p-8 flex flex-col h-full">
                        {/* Header */}
                        <div className="text-center mb-6">
                          <div className="flex justify-center mb-4">
                            {plan.icon}
                          </div>
                          <h3 className="text-2xl font-bold mb-2 text-gray-900">
                            {plan.name}
                          </h3>
                          <div className="text-blue-700 mb-3">
                            <div className="text-lg font-semibold">
                              {plan.subtitle}
                            </div>
                            <div className="text-sm font-medium text-gray-600 mt-1">
                              ({plan.badge})
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-600 text-sm mb-6 text-center leading-relaxed">
                          {plan.description}
                        </p>

                        {/* Features */}
                        <div className="mb-8 flex-grow">
                          <h4 className="text-sm font-semibold text-gray-900 mb-4 text-center">What's Included:</h4>
                          <ul className="space-y-3">
                            {plan.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-start">
                                <Check className="h-4 w-4 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* PayPal Button - Fixed at bottom */}
                        <div className="mt-auto">
                          <PayPalButtons
                            style={{ 
                              layout: "vertical",
                              color: "blue",
                              shape: "rect",
                              label: "pay"
                            }}
                            createOrder={createOrder}
                            onApprove={onApprove}
                          />
                          
                          {/* Alternative Payment Button */}
                          <button
                            onClick={handleCardClick}
                            className="w-full mt-3 px-4 py-3 bg-blue-700 text-white rounded-lg hover:bg-[#fa5252] transition-colors text-sm font-medium"
                          >
                            Other Payment Methods
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Popup Modal */}
            {showPopup && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex justify-between items-center border-b pb-4 mb-6">
                      <h3 className="text-2xl font-bold text-gray-900">
                        Payment Information
                      </h3>
                      <button
                        onClick={() => setShowPopup(false)}
                        className="text-gray-500 hover:text-gray-700 focus:outline-none rounded-full p-1 hover:bg-gray-100"
                      >
                        <svg
                          className="h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    {/* Bank Details */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3 text-[#fa5252] flex items-center">
                        <Building className="h-5 w-5 mr-2" />
                        Bank Account Details
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <p className="mb-2 text-blue-700">
                          <span className="font-semibold text-[#fa5252]">Account Name:</span>{" "}
                          {bankDetails.accountName}
                        </p>
                        {/* Add additional bank details here */}
                      </div>
                    </div>

                    {/* Company Information */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3 text-[#fa5252] flex items-center">
                        <Globe className="h-5 w-5 mr-2" />
                        Company Information
                      </h4>
                      <div className="bg-gray-50 p-5 rounded-lg border border-blue-700">
                        <p className="font-semibold mb-2 text-blue-700">
                          {companyDetails.name}
                        </p>
                        <p className="text-[#000000] mb-4 text-sm">
                          {companyDetails.address}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="text-sm">
                            <span className="font-semibold text-blue-700">CIN:</span>
                            <p className="text-[#000000]">{companyDetails.cin}</p>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-blue-700">PAN:</span>
                            <p className="text-[#000000]">{companyDetails.pan}</p>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold text-blue-700">TIN:</span>
                            <p className="text-[#000000]">{companyDetails.tin}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3 text-[#fa5252] flex items-center">
                        <Users className="h-5 w-5 mr-2" />
                        Contact Us
                      </h4>
                      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {companyDetails.contacts.map((contact, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-semibold text-blue-700">
                              {contact.label}:
                            </span>
                            <p className="text-[#000000]">{contact.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Payment Instructions */}
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3 text-blue-700 flex items-center">
                        <Check className="h-5 w-5 mr-2" />
                        Payment Instructions
                      </h4>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <ol className="list-decimal pl-5 space-y-2 text-sm">
                          <li>
                            Transfer the payment to the bank account mentioned above
                          </li>
                          <li>
                            Include your name and selected token type in the payment reference
                          </li>
                          <li>
                            After payment, please email the transaction details to admin@sportsgiri.com
                          </li>
                          <li>
                            Our team will process your token within 24-48 business hours
                          </li>
                        </ol>
                      </div>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={() => setShowPopup(false)}
                        className="px-6 py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors font-medium"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Membership Benefits */}
            <section className="py-20 bg-white">
              <div className="max-w-6xl mx-auto px-4">
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl font-bold mb-4">
                    Membership Benefits
                  </h2>
                  <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Unlock exclusive advantages and take your shooting journey to the next level
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-blue-50 p-8 rounded-xl shadow-lg border border-blue-100">
                    <div className="flex items-center mb-4">
                      <div className="bg-blue-700 p-3 rounded-lg mr-4">
                        <Star className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-blue-700">
                        Competition Access
                      </h3>
                    </div>
                    <p className="text-gray-700 mb-4">
                      GSL members gain access to our network of sanctioned competitions around the world, from local matches to international championships.
                    </p>
                    <p className="text-gray-700">
                      Your membership level determines the priority and scope of competitions you can enter, with Elite members receiving VIP treatment at all events.
                    </p>
                  </div>

                  <div className="bg-red-50 p-8 rounded-xl shadow-lg border border-red-100">
                    <div className="flex items-center mb-4">
                      <div className="bg-[#fa5252] p-3 rounded-lg mr-4">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-[#fa5252]">
                        Training Resources
                      </h3>
                    </div>
                    <p className="text-gray-700 mb-4">
                      Access our extensive library of training materials, including video tutorials, technique guides, and mental preparation resources.
                    </p>
                    <p className="text-gray-700">
                      Premium and Elite members receive additional personalized coaching and advanced training opportunities to accelerate their development.
                    </p>
                  </div>

                  <div className="bg-blue-50 p-8 rounded-xl shadow-lg border border-blue-100">
                    <div className="flex items-center mb-4">
                      <div className="bg-blue-700 p-3 rounded-lg mr-4">
                        <Globe className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-blue-700">
                        Community & Networking
                      </h3>
                    </div>
                    <p className="text-gray-700 mb-4">
                      Connect with fellow shooting enthusiasts, coaches, and professionals through our online forums, social events, and competitions.
                    </p>
                    <p className="text-gray-700">
                      Build relationships that can help advance your shooting career and open doors to new opportunities in the sport.
                    </p>
                  </div>

                  <div className="bg-red-50 p-8 rounded-xl shadow-lg border border-red-100">
                    <div className="flex items-center mb-4">
                      <div className="bg-[#fa5252] p-3 rounded-lg mr-4">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-[#fa5252]">
                        Equipment Discounts
                      </h3>
                    </div>
                    <p className="text-gray-700 mb-4">
                      Enjoy exclusive discounts on shooting equipment, accessories, and apparel from our network of partner manufacturers and retailers.
                    </p>
                    <p className="text-gray-700">
                      Premium and Elite members receive higher discount percentages and early access to new product releases.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* FAQs */}
            <section className="py-20 bg-gray-50">
              <div className="max-w-4xl mx-auto px-4">
                <div className="text-center mb-12">
                  <h2 className="text-3xl md:text-5xl font-black mb-12 uppercase text-[#1d4ed8]">
                    Frequently Asked <span className="text-[#ff6b6b]">Questions</span>
                  </h2>
                  <p className="text-xl text-gray-600">
                    Find answers to common questions about our membership plans
                  </p>
                </div>

                <div className="space-y-6">
                  {[
                    {
                      question: "How do I upgrade my membership?",
                      answer: "To upgrade your membership, please contact us. Our team will assist you in selecting the best plan for your needs."
                    },
                    {
                      question: "Are there age restrictions for membership?",
                      answer: "We offer junior memberships for shooters under 18 years of age. To learn more, please reach out to us."
                    },
                    {
                      question: "Do you offer team or club memberships?",
                      answer: "Yes, we have special rates for clubs and teams. Please contact our membership department for more details."
                    },
                    {
                      question: "What is your refund policy?",
                      answer: "Memberships can be canceled within 30 days for a full refund. After that, no refunds are provided. For assistance, please contact support."
                    },
                    {
                      question: "How do I register for competitions?",
                      answer: "You can register through your account dashboard. If you need help, please contact us."
                    }
                  ].map((faq, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="text-xl font-bold mb-3 text-blue-700">
                        {faq.question}
                      </h3>
                      <p className="text-[#ff6b6b] text-sm leading-relaxed">
                        {faq.answer.includes("contact us") ? (
                          <>
                            {faq.answer.split("contact us")[0]}
                            <Link to="/contact" className="text-blue-600 hover:underline font-medium">
                              contact us
                            </Link>
                            {faq.answer.split("contact us")[1]}
                          </>
                        ) : faq.answer.includes("reach out to us") ? (
                          <>
                            {faq.answer.split("reach out to us")[0]}
                            <Link to="/contact" className="text-blue-600 hover:underline font-medium">
                              reach out to us
                            </Link>
                            {faq.answer.split("reach out to us")[1]}
                          </>
                        ) : faq.answer.includes("contact our membership department") ? (
                          <>
                            {faq.answer.split("contact our membership department")[0]}
                            <Link to="/contact" className="text-blue-600 hover:underline font-medium">
                              contact our membership department
                            </Link>
                            {faq.answer.split("contact our membership department")[1]}
                          </>
                        ) : faq.answer.includes("contact support") ? (
                          <>
                            {faq.answer.split("contact support")[0]}
                            <Link to="/contact" className="text-blue-600 hover:underline font-medium">
                              contact support
                            </Link>
                            {faq.answer.split("contact support")[1]}
                          </>
                        ) : (
                          faq.answer
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-[#0f172a] text-white">
              <div className="max-w-4xl mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
                  READY TO JOIN <span className="text-[#ff6b6b]">GLOBAL SHOOTING LEAGUE?</span>
                </h2>
                <p className="text-xl mb-8 opacity-90 text-white">
                  Take the first step toward improving your shooting skills and joining our worldwide community of enthusiasts.
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Link to="/signup">
                    <button className="bg-white text-[#1d4ed8] hover:bg-[#ff6b6b] hover:text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all transform hover:scale-105">
                      Sign Up Today
                    </button>
                  </Link>
                  <Link to="/contact">
                    <button className="bg-white text-[#1d4ed8] hover:bg-[#ff6b6b] hover:text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-sm transition-all transform hover:scale-105">
                      Contact Us
                    </button>
                  </Link>
                </div>
              </div>
            </section>
          </main>
        </Layout>
      </div>
    </PayPalScriptProvider>
  );
}
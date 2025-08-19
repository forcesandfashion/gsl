import React from "react";
import { X, Crown, ShieldCheck, Zap, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const BuyPremiumModal = ({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const premiumFeatures = [
    {
      icon: <Crown className="w-6 h-6 text-yellow-500" />,
      title: "Exclusive Access",
      description: "Unlock premium ranges and advanced features.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-green-500" />,
      title: "Verified Badge",
      description: "Stand out with a verified premium badge.",
    },
    {
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      title: "Faster Bookings",
      description: "Get priority booking slots and faster approvals.",
    },
    {
      icon: <Star className="w-6 h-6 text-purple-500" />,
      title: "Premium Support",
      description: "24/7 customer support for all your needs.",
    },
  ];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-gray-800">
            Upgrade to Premium
          </h2>
          <p className="text-gray-600 mt-2">
            Enjoy exclusive features and take your experience to the next level.
          </p>
        </div>

        {/* Features */}
        <div className="grid gap-4 mb-6">
          {premiumFeatures.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              {feature.icon}
              <div>
                <h3 className="font-semibold text-gray-800">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Price */}
        <div className="text-center mb-6">
          <p className="text-gray-600">Starting at</p>
          <p className="text-3xl font-bold text-gray-900">₹1,000/month</p>
        </div>

        {/* CTA Button */}
        <div className="flex gap-4">
          <Button
            onClick={() => {
              onClose(); // Close modal
              navigate("/dashboard/range-owner/subscription"); // Redirect to payments page
            }}
            className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-semibold py-3 px-6 shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Crown className="w-5 h-5" />
            Upgrade Now - ₹1,000/month
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BuyPremiumModal;

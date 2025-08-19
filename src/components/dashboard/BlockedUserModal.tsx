import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX, Phone, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BlockUserModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleClose = () => {
    onClose && onClose();
    navigate("/");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
        <CardHeader className="text-center pb-6 bg-gradient-to-br from-red-50 to-red-100 rounded-t-lg">
          <div className="mx-auto mb-4 w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
            <ShieldX className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold text-red-600 mb-2">
            BLOCKED
          </CardTitle>
          <p className="text-red-700 font-medium text-lg">
            Your account has been blocked
          </p>
        </CardHeader>
        
        <CardContent className="p-8 text-center space-y-6">
          <div className="space-y-4">
            <p className="text-gray-700 text-base leading-relaxed">
              Please contact the number for query or unblocking your account.
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Phone className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Contact Number</span>
              </div>
              <a 
                href="tel:8744874477" 
                className="text-2xl font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                8744874477
              </a>
            </div>
            
            <div className="text-sm text-gray-500 space-y-1">
              <p>Available: Monday - Friday, 9:00 AM - 6:00 PM</p>
              <p>Response time: Within 24 hours</p>
            </div>
          </div>

          <Button 
            onClick={handleClose}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Go to Home Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockUserModal;
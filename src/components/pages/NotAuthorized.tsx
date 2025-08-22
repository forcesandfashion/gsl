// app/not-authorized/page.tsx
"use client";
import { useNavigate } from "react-router-dom";

export default function NotAuthorizedPage() {
  const router = useNavigate();
  
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-gradient-to-br from-red-50 to-orange-50 px-4 py-8"
      style={{ backgroundImage: "url('/bgImage.jpg')" }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      
      <div className="relative z-10 bg-white shadow-2xl rounded-3xl p-6 sm:p-8 lg:p-10 w-full max-w-md lg:max-w-lg xl:max-w-xl border border-gray-100 backdrop-blur-sm">
        {/* Header Section with Icon */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-6 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
            <svg 
              className="w-10 h-10 sm:w-12 sm:h-12 text-white" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-red-600 mb-4">
            Access Denied
          </h1>
          
          <div className="w-16 h-1 bg-gradient-to-r from-red-400 to-red-600 rounded-full mx-auto mb-6"></div>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Status Message */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-red-500 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-800 mb-2">
                  Authorization Pending
                </h3>
                <p className="text-gray-700 text-sm sm:text-base leading-relaxed">
                  The status of your <span className="font-semibold text-red-700 bg-red-100 px-2 py-1 rounded">range owner</span>{" "}
                  account has not been authorized by the admin yet. Please wait until
                  your account is approved.
                </p>
              </div>
            </div>
          </div>

          {/* What's Next Section */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-3 flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
              </svg>
              What's Next?
            </h3>
            <ul className="space-y-2 text-sm sm:text-base text-blue-700">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></span>
                Your application is under review
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></span>
                You'll receive notification once approved
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-blue-400 rounded-full mr-3 flex-shrink-0"></span>
                Contact support if you have questions
              </li>
            </ul>
          </div>

          {/* Support Information */}
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-800 font-semibold text-sm sm:text-base">
                    Need Help? Contact Support
                  </p>
                  <p className="text-gray-600 text-xs sm:text-sm">
                    Available: 10:00 AM – 6:00 PM
                  </p>
                </div>
              </div>
              <div className="text-right">
                <a 
                  href="tel:+15551234567" 
                  className="text-blue-600 font-bold text-lg sm:text-xl hover:text-blue-700 transition-colors"
                >
                  +1 (555) 123-4567
                </a>
                <p className="text-xs text-gray-500">Click to call</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-4">
            <button
              onClick={() => router("/")}
              className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm sm:text-base hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 transform hover:scale-[1.02] shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Go to Main Menu</span>
            </button>
          </div>

          {/* Footer Note */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-xs sm:text-sm text-gray-500">
              This process typically takes 1-3 business days
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
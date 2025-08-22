// app/not-authorized/page.tsx
"use client";

import { useNavigate } from "react-router-dom";

export default function NotAuthorizedPage() {
  const router = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen h-screen bg-cover bg-center bg-gray-50 px-4"
    style={{ backgroundImage: "url('/public/bgImage.jpg')" }}>
      <div className="bg-white shadow-lg rounded-2xl p-8 max-w-md w-full text-center border border-gray-200">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          Access Denied
        </h1>

        <p className="text-gray-700 mb-6">
          The status of your <span className="font-semibold">range owner</span>{" "}
          account has not been authorized by the admin yet. Please wait until
          your account is approved.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-gray-800 font-medium">📞 Support Hours</p>
          <p className="text-gray-600">10:00 AM – 6:00 PM</p>
          <p className="text-blue-600 font-semibold mt-1">+1 (555) 123-4567</p>
        </div>

        <button
          onClick={() => router("/")}
          className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
        >
          Go to Main Menu
        </button>
      </div>
    </div>
  );
}

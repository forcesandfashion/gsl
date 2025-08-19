import React from "react";
import { getAuth } from "firebase/auth";  // 👈 import Firebase Auth

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: any) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpayInstance {
  open(): void;
  close(): void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

function Payments() {
  const handlePayment = async () => {
    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      alert("You must be logged in to make a payment!");
      return;
    }

    // Get Firebase UID (and optionally email)
    const userId = user.uid;
    const email = user.email || "";

    // 1. Create order from Firebase Function
    const res = await fetch("/api/createOrder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, amount: 1000, plan: "premium" }), // 👈 send uid + amount + plan
    });

    const order = await res.json();

    // 2. Open Razorpay Checkout
    const options: RazorpayOptions = {
      key: "YOUR_RAZORPAY_KEY_ID", // Replace with your Razorpay key_id
      amount: order.amount,
      currency: order.currency,
      name: "Global Shooting League",
      description: "Premium Subscription",
      order_id: order.id,
      handler: function (response) {
        // This runs when payment is successful
        alert("Payment Successful!");
        console.log("Payment Response:", response);

        // ✅ Optionally verify payment with backend
        fetch("/api/verifyPayment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...response, userId }),
        });
      },
      prefill: {
        name: user.displayName || "Deepak Singh",
        email: email,
        contact: "9999999999",
      },
      theme: { color: "#3399cc" },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <h1 className="text-2xl font-bold mb-6">Premium Subscription</h1>
      <button
        onClick={handlePayment}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700"
      >
        Pay ₹500 Now
      </button>
    </div>
  );
}

export default Payments;

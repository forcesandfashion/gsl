import { ReactNode } from "react";
import { Link } from "react-router-dom";
import Layout from "../pages/Layout";

export default function AuthLayout({ children, title }: { children: ReactNode, title: string }) {
  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8 md:py-12">
        <div className="relative flex flex-col md:flex-row w-full max-w-6xl bg-white rounded-2xl md:rounded-3xl shadow-xl md:shadow-2xl overflow-hidden min-h-[500px] md:min-h-[600px]">
          {/* Left Section - Image/Illustration (Hidden on mobile, shown on md and up) */}
          <div className="hidden md:flex relative w-full md:w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center p-8 lg:p-12 text-white text-center">
            <div className="absolute inset-0 bg-pattern opacity-10"></div>
            <div className="z-10 max-w-xs lg:max-w-md">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 leading-tight drop-shadow-lg">
                {title === "Sign In" ? "Welcome Back!" : "New here?"}
              </h2>
              <p className="text-lg font-medium mb-8 text-white opacity-95 drop-shadow-md">
                {title === "Sign In" 
                  ? "Sign in to continue your shooting journey with our community."
                  : "Join our community to connect with other shooting enthusiasts."
                }
              </p>
              
              {title === "Sign In" ? (
                <Link
                  to="/signup"
                  className="inline-block px-6 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  CREATE ACCOUNT
                </Link>
              ) : (
                <Link
                  to="/signin"
                  className="inline-block px-6 py-3 border-2 border-white text-white font-semibold rounded-full hover:bg-white hover:text-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  SIGN IN
                </Link>
              )}
              
              <div className="mt-8 lg:mt-12">
                <img 
                  src="/GSL2.jpg" 
                  alt="Shooting sports illustration" 
                  className="max-w-full h-auto mx-auto rounded-lg shadow-md" 
                />
              </div>
            </div>
          </div>

          {/* Mobile header banner (shown only on mobile) */}
          <div className="md:hidden w-full bg-gradient-to-r from-blue-600 to-blue-700 py-4 px-6 text-white">
            <div className="flex items-center justify-center">
              <img 
                src="/GSL2.jpg" 
                alt="Global Shooting League" 
                className="h-10 w-10 mr-3 rounded-full object-cover"
              />
              <h1 className="text-xl font-bold">Global Shooting League</h1>
            </div>
          </div>

          {/* Right Section - Auth Form */}
          <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-8 lg:p-12">
            <div className="w-full max-w-md">
              {/* Mobile toggle between sign in/sign up */}
              <div className="md:hidden flex justify-center mb-6">
                <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                  <Link
                    to="/signin"
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                      title === "Sign In" 
                        ? "bg-white text-blue-600 shadow-sm" 
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
                      title === "Sign Up" 
                        ? "bg-white text-blue-600 shadow-sm" 
                        : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    Sign Up
                  </Link>
                </div>
              </div>

              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
                  {title}
                </h2>
                <p className="mt-2 text-gray-600 text-sm md:text-base">
                  {title === "Sign In" 
                    ? "Enter your credentials to access your account"
                    : "Create your account to get started"
                  }
                </p>
              </div>
              
              {children}
              
              {/* Mobile sign up/sign in prompt */}
              <div className="mt-6 md:hidden text-center">
                <p className="text-gray-600 text-sm">
                  {title === "Sign In" 
                    
                  }
                  <Link 
                    to={title === "Sign In" ? "/signup" : "/login"} 
                    className="text-blue-600 font-medium hover:text-blue-700"
                  >
                    {title === "Sign In" ? "Sign Up" : "Sign In"}
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
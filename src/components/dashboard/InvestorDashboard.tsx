import React, { useState, useEffect } from "react";
import { useAuth } from "@/firebase/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter, // Added CardFooter import for the new button
} from "@/components/ui/card";
import {
  DollarSign, // We'll keep this icon for visual consistency in the card
  TrendingUp,
  TrendingDown,
  Briefcase,
  Target,
  BarChart,
  Bell,
  Clock,
  Zap,
  Shield,
  ArrowRightCircle,
  Users,
} from "lucide-react";

// Assuming existing Firebase and utility imports
// import { db } from "@/firebase/config";

// --- INVESTOR-SPECIFIC CONSTANTS & TYPES ---
interface PortfolioMetric {
  title: string;
  value: string;
  trend: string;
  trendColor: "text-emerald-500" | "text-rose-500" | "text-blue-500";
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
}

interface InvestmentOpportunity {
  id: string;
  name: string;
  type: string;
  targetReturn: number;
  minInvestment: string;
  risk: "Low" | "Medium" | "High";
}

const mockOpportunities: InvestmentOpportunity[] = [
  {
    id: "OP001",
    name: "Elite Shooter Fund Q4",
    type: "Seed Round",
    targetReturn: 35,
    minInvestment: "₹25,000", 
    risk: "High",
  },
  {
    id: "OP002",
    name: "Training Center Expansion",
    type: "Real Estate Debt",
    targetReturn: 12,
    minInvestment: "₹5,000",
    risk: "Medium",
  },
  {
    id: "OP003",
    name: "Tech Platform Upgrade",
    type: "SaaS Equity",
    targetReturn: 20,
    minInvestment: "₹50,000",
    risk: "Medium",
  },
];

const InvestorDashboard = () => {
  const { signOut, user } = useAuth(); // Assuming this hook works
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalValue: 1254300, 
    dailyChange: 15320,
    ytdReturn: 18.5,
    activeInvestments: 7,
    loading: true,
  });

  useEffect(() => {
    // Simulate data fetching
    setTimeout(() => {
      setDashboardData({
        totalValue: 1254300,
        dailyChange: 15320,
        ytdReturn: 18.5,
        activeInvestments: 7,
        loading: false,
      });
    }, 1000);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  /** * Function to navigate to the detailed view of a specific investment opportunity
   */
  const handleReviewInvestment = (opportunityId: string) => {
    // Navigate to a route that will display detailed stats for this ID
    navigate(`/investor/opportunities/${opportunityId}`);
    // You must set up a route in your router like:
    // <Route path="/investor/opportunities/:id" element={<OpportunityDetailPage />} />
  };

  /**
   * Function to navigate to the full list of opportunities
   */
  const handleViewAllOpportunities = () => {
    navigate(`/dashboard/investor/opportunities`); 
  };


  const formatCurrency = (amount: number) => {
    if (dashboardData.loading) return '...';
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getMetrics = (data: typeof dashboardData): PortfolioMetric[] => [
    {
      title: "Total Portfolio Value",
      value: formatCurrency(data.totalValue),
      trend: "+8.5% (All Time)",
      trendColor: "text-emerald-500",
      icon: <DollarSign className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-indigo-500 to-blue-600",
      borderColor: "border-indigo-600",
    },
    {
      title: "Today's Change",
      value: formatCurrency(data.dailyChange),
      trend: "+1.2%",
      trendColor: "text-emerald-500",
      icon: <TrendingUp className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-emerald-500 to-green-600",
      borderColor: "border-emerald-600",
    },
    {
      title: "YTD Return",
      value: data.loading ? "..." : `${data.ytdReturn.toFixed(1)}%`,
      trend: "Target: 15%",
      trendColor: "text-blue-500",
      icon: <Target className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-blue-500 to-cyan-600",
      borderColor: "border-blue-600",
    },
    {
      title: "Active Investments",
      value: data.loading ? "..." : data.activeInvestments.toString(),
      trend: "3 New this quarter",
      trendColor: "text-rose-500",
      icon: <Briefcase className="h-5 w-5 text-white" />,
      bgColor: "bg-gradient-to-br from-rose-500 to-red-600",
      borderColor: "border-rose-600",
    },
  ];

  const metrics = getMetrics(dashboardData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      {/* Header section (Unchanged) */}
      <header className="bg-white/90 shadow-sm backdrop-blur-md sticky top-0 z-10 border-b border-slate-200/50 flex items-center h-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <div>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-1.5 flex-wrap">
                  Investor Dashboard:
                  <span className="text-indigo-600">
                    {user?.displayName || user?.email?.split("@")[0] || "Investor"}
                  </span>
                </h1>
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <Shield className="w-3 h-3" /> Portfolio Overview
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <Button
                onClick={() => navigate("/investor/statements")} // Placeholder
                variant="outline"
                className="font-semibold px-3 py-1 border-slate-200 hover:bg-slate-50 transition-all duration-200 text-xs"
                size="sm"
              >
                <Clock className="w-3 h-3 mr-1" /> History
              </Button>
              <Button
                onClick={handleSignOut}
                className="font-semibold px-3 py-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-xs"
                size="sm"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* STATS CARDS (Unchanged) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {metrics.map((metric) => (
            <Card
              key={metric.title}
              className={`bg-white border-b-4 ${metric.borderColor} shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group`}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                <CardTitle className="text-sm font-semibold text-gray-900">
                  {metric.title}
                </CardTitle>
                <div className={`p-2 rounded-lg group-hover:opacity-90 transition-colors ${metric.bgColor}`}>
                  <DollarSign className="h-5 w-5 text-white" /> 
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                <div className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">
                  {metric.value}
                </div>
                <p className={`text-xs font-medium flex items-center gap-1 ${metric.trendColor}`}>
                  {metric.trend}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Portfolio Allocation (Left 2 Columns - Unchanged) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-blue-500" />
                  Portfolio Allocation (By Sector)
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Distribution of capital across investment sectors.
                </CardDescription>
              </CardHeader>
                <CardContent className="pt-6 p-4 md:p-6">
                <div className="h-[250px] flex items-center justify-center bg-blue-50 border border-dashed rounded-lg">
                  <svg viewBox="0 0 200 200" className="w-48 h-48">
                  {/* Pie Chart */}
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#4f46e5" strokeWidth="60" strokeDasharray="226.19 502.65" strokeDashoffset="0" opacity="0.9" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#10b981" strokeWidth="60" strokeDasharray="150.80 502.65" strokeDashoffset="-226.19" opacity="0.9" />
                  <circle cx="100" cy="100" r="80" fill="none" stroke="#ef4444" strokeWidth="60" strokeDasharray="125.66 502.65" strokeDashoffset="-376.99" opacity="0.9" />
                  <text x="100" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#1f2937">Portfolio</text>
                  </svg>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-6 text-sm">
                  <AllocationPill color="bg-indigo-600" label="Coaching Tech" percentage="45%" />
                  <AllocationPill color="bg-emerald-600" label="Real Estate" percentage="30%" />
                  <AllocationPill color="bg-red-600" label="Liquidity" percentage="25%" />
                </div>
                </CardContent>
            </Card>

            {/* Performance Over Time Chart (Unchanged) */}
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Cumulative Performance
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Total portfolio value over the last 12 months.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 p-4 md:p-6">
                <div className="h-[250px] flex items-center justify-center bg-gray-50 border border-dashed rounded-lg text-slate-400">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <polyline
                    fill="none"
                    stroke="#4f46e5"
                    strokeWidth="2"
                    points="0,80 10,60 20,70 30,40 40,50 50,20 60,30 70,10 80,30 90,20 100,10"
                  />
                  <circle cx="0" cy="80" r="2" fill="#4f46e5" />
                  <circle cx="10" cy="60" r="2" fill="#4f46e5" />
                  <circle cx="20" cy="70" r="2" fill="#4f46e5" />
                  <circle cx="30" cy="40" r="2" fill="#4f46e5" />
                  <circle cx="40" cy="50" r="2" fill="#4f46e5" />
                  <circle cx="50" cy="20" r="2" fill="#4f46e5" />
                  <circle cx="60" cy="30" r="2" fill="#4f46e5" />
                  <circle cx="70" cy="10" r="2" fill="#4f46e5" />
                  <circle cx="80" cy="30" r="2" fill="#4f46e5" />
                  <circle cx="90" cy="20" r="2" fill="#4f46e5" />
                  <circle cx="100" cy="10" r="2" fill="#4f46e5" />
                </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Investment Opportunities (Right Column) */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  New Opportunities
                </CardTitle>
                <CardDescription className="text-slate-600">
                  Curated projects ready for investment.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-amber-50/70">
                  {mockOpportunities.map((op) => (
                    <li
                      key={op.id}
                      className="p-4 md:p-5 hover:bg-amber-50/50 transition-colors cursor-pointer"
                      // Make the whole list item clickable, but the button takes precedence
                      onClick={() => handleReviewInvestment(op.id)}
                    >
                      <h3 className="font-semibold text-gray-900 flex items-center justify-between">
                        {op.name}
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                          +{op.targetReturn}% IRR
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 mb-2">{op.type}</p>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-indigo-600 font-medium">{op.minInvestment} Min</span> 
                        <RiskTag risk={op.risk} />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-indigo-600 border-indigo-200 hover:bg-indigo-100/70"
                          // Call the navigation function on button click
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent the parent <li> click event
                            handleReviewInvestment(op.id);
                          }}
                        >
                          Review <ArrowRightCircle className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
              {/* Added CardFooter for the "View More" button */}
              <CardFooter className="flex justify-center p-4 border-t border-slate-100">
                <Button 
                  variant="ghost" 
                  className="text-indigo-600 hover:bg-indigo-50/50"
                  onClick={handleViewAllOpportunities}
                >
                  View All Opportunities <ArrowRightCircle className="w-4 h-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
            
            {/* Quick Link Card for Investor Profile (Unchanged) */}
             <Card 
                onClick={() => navigate("/investor/profile")} 
                className="bg-gradient-to-br from-purple-50 to-purple-100 border-0 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group" 
             >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-semibold text-purple-900">Investor Profile</CardTitle>
                    <div className="p-2 bg-purple-500 rounded-lg group-hover:bg-purple-600 transition-colors">
                        <Users className="h-5 w-5 text-white" />
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold text-purple-900 mb-1">
                        View Documents & KYC
                    </div>
                    <p className="text-xs text-purple-700 font-medium">
                        Ensure all your credentials are up to date.
                    </p>
                </CardContent>
             </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

// Helper components (Unchanged)
const RiskTag = ({ risk }: { risk: "Low" | "Medium" | "High" }) => {
  let colorClass = "bg-gray-100 text-gray-700";
  if (risk === "High") colorClass = "bg-red-100 text-red-700";
  if (risk === "Medium") colorClass = "bg-amber-100 text-amber-700";
  if (risk === "Low") colorClass = "bg-green-100 text-green-700";

  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${colorClass}`}>
      {risk}
    </span>
  );
};

const AllocationPill = ({ color, label, percentage }: { color: string, label: string, percentage: string }) => (
    <div className="flex items-center gap-2">
        <span className={`w-3 h-3 rounded-full ${color} flex-shrink-0`}></span>
        <span className="text-slate-700">{label}</span>
        <span className="font-semibold text-gray-900 ml-auto">{percentage}</span>
    </div>
);


export default InvestorDashboard;
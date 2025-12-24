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
  CardFooter,
} from "@/components/ui/card";
import {
  DollarSign,
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
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PortfolioMetric {
  title: string;
  value: string;
  trend: string;
  trendColor: "text-green-600" | "text-[#ff6b6b]" | "text-[#1d4ed8]";
  icon: React.ReactNode;
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
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState({
    totalValue: 1254300, 
    dailyChange: 15320,
    ytdReturn: 18.5,
    activeInvestments: 7,
    loading: true,
  });

  useEffect(() => {
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

  const handleReviewInvestment = (opportunityId: string) => {
    navigate(`/investor/opportunities/${opportunityId}`);
  };

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

  const metrics: PortfolioMetric[] = [
    {
      title: "Portfolio Value",
      value: formatCurrency(dashboardData.totalValue),
      trend: "+8.5% Total",
      trendColor: "text-green-600",
      icon: <DollarSign className="h-4 w-4" />,
      borderColor: "border-[#1d4ed8]",
    },
    {
      title: "Daily Delta",
      value: formatCurrency(dashboardData.dailyChange),
      trend: "+1.2%",
      trendColor: "text-green-600",
      icon: <TrendingUp className="h-4 w-4" />,
      borderColor: "border-[#ff6b6b]",
    },
    {
      title: "YTD Return",
      value: dashboardData.loading ? "..." : `${dashboardData.ytdReturn.toFixed(1)}%`,
      trend: "Target: 15%",
      trendColor: "text-[#1d4ed8]",
      icon: <Target className="h-4 w-4" />,
      borderColor: "border-[#1d4ed8]",
    },
    {
      title: "Asset Count",
      value: dashboardData.loading ? "..." : dashboardData.activeInvestments.toString(),
      trend: "3 New Q4",
      trendColor: "text-[#ff6b6b]",
      icon: <Briefcase className="h-4 w-4" />,
      borderColor: "border-[#ff6b6b]",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Solid White / Blue Border */}
      <header className="bg-white shadow-2xl border-b-4 border-[#ff6b6b] sticky top-0 z-10 h-24 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-[#1d4ed8] rounded-xl flex items-center justify-center shadow-lg">
                <Target className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-lg md:text-xl font-black text-[#1d4ed8] uppercase tracking-tighter">
                Capital <span className="text-[#ff6b6b]">Command</span>:
                <span className="ml-2 text-[#0f172a]">
                  {user?.displayName || "Investor"}
                </span>
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate("/investor/statements")}
                variant="outline"
                className="border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 font-bold uppercase tracking-widest text-[10px]"
              >
                History
              </Button>
              <Button
                onClick={handleSignOut}
                className="bg-[#ff6b6b] hover:bg-[#fa5252] text-white font-black uppercase tracking-widest text-[10px]"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* STATS CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {metrics.map((metric) => (
            <Card key={metric.title} className={cn("border-0 shadow-lg bg-white border-t-4 transition-transform hover:scale-105", metric.borderColor)}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{metric.title}</CardTitle>
                <div className="text-[#1d4ed8]">{metric.icon}</div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-black text-[#0f172a]">{metric.value}</div>
                <p className={cn("text-[10px] font-bold uppercase mt-1", metric.trendColor)}>{metric.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Pie Chart Card */}
            <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-[#0f172a] p-6 border-b border-white/10">
                <CardTitle className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                  <BarChart className="text-[#ff6b6b] w-4 h-4" /> Capital Allocation
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center justify-around gap-8">
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 200 200" className="transform -rotate-90">
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#1d4ed8" strokeWidth="40" strokeDasharray="226 502" />
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#10b981" strokeWidth="40" strokeDasharray="150 502" strokeDashoffset="-226" />
                      <circle cx="100" cy="100" r="80" fill="none" stroke="#ff6b6b" strokeWidth="40" strokeDasharray="126 502" strokeDashoffset="-376" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Equity</span>
                      <span className="text-xl font-black text-[#0f172a]">GSL</span>
                    </div>
                  </div>
                  <div className="space-y-4 w-full md:w-auto">
                    <AllocationPill color="bg-[#1d4ed8]" label="Coaching Tech" percentage="45%" />
                    <AllocationPill color="bg-emerald-500" label="Real Estate" percentage="30%" />
                    <AllocationPill color="bg-[#ff6b6b]" label="Liquidity" percentage="25%" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Line Chart Card */}
            <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden border-b-8 border-[#1d4ed8]">
              <CardHeader className="p-8 border-b border-gray-100 flex justify-between items-center">
                <div>
                  <CardTitle className="font-black text-[#0f172a] uppercase tracking-tighter text-xl">Cumulative Alpha</CardTitle>
                  <CardDescription className="uppercase text-[10px] font-bold text-gray-400">12-Month Performance Cycle</CardDescription>
                </div>
                <TrendingUp className="text-green-500 w-8 h-8" />
              </CardHeader>
              <CardContent className="p-8">
                <div className="h-[200px] w-full">
                  <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                    <path d="M0,35 Q10,30 20,32 T40,15 T60,20 T80,5 T100,2" fill="none" stroke="#1d4ed8" strokeWidth="1.5" />
                    <path d="M0,35 Q10,30 20,32 T40,15 T60,20 T80,5 T100,2 V40 H0 Z" fill="url(#grad)" opacity="0.1" />
                    <defs>
                      <linearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#1d4ed8', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#1d4ed8', stopOpacity: 0 }} />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-8">
            {/* Opportunities List */}
            <Card className="shadow-2xl border-0 bg-white rounded-[2rem] overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-100 p-6">
                <CardTitle className="text-sm font-black text-[#0f172a] uppercase tracking-widest flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ff6b6b]" /> Fresh Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-gray-50">
                  {mockOpportunities.map((op) => (
                    <li key={op.id} onClick={() => handleReviewInvestment(op.id)} className="p-6 hover:bg-blue-50/30 transition-all cursor-pointer group">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-[#0f172a] uppercase text-sm tracking-tight group-hover:text-[#1d4ed8]">{op.name}</h3>
                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-md">+{op.targetReturn}% IRR</span>
                      </div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{op.type}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black text-[#1d4ed8]">{op.minInvestment}</span>
                        <RiskTag risk={op.risk} />
                        <Button size="sm" variant="ghost" className="text-[#ff6b6b] p-0 hover:bg-transparent">
                          <ChevronRight />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="p-6 bg-gray-50 border-t border-gray-100">
                <Button onClick={handleViewAllOpportunities} className="w-full bg-[#1d4ed8] hover:bg-[#ff6b6b] text-white font-black uppercase tracking-widest text-[10px] py-6 rounded-2xl">
                  Explore All Nodes
                </Button>
              </CardFooter>
            </Card>

            {/* KYC Card */}
            <Card onClick={() => navigate("/investor/profile")} className="shadow-2xl border-0 bg-white rounded-[2.5rem] overflow-hidden border-t-8 border-[#ff6b6b] cursor-pointer hover:scale-105 transition-transform">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compliance</CardTitle>
                  <Shield className="text-[#ff6b6b] w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-black text-[#0f172a] uppercase">KYC & Documents</div>
                <p className="text-[10px] font-bold text-[#1d4ed8] uppercase mt-1 tracking-widest">Update Required</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

const RiskTag = ({ risk }: { risk: "Low" | "Medium" | "High" }) => {
  const styles = {
    High: "bg-red-50 text-[#ff6b6b]",
    Medium: "bg-amber-50 text-amber-600",
    Low: "bg-green-50 text-green-600",
  };
  return (
    <span className={cn("text-[9px] font-black uppercase px-3 py-1 rounded-full", styles[risk])}>
      {risk} Risk
    </span>
  );
};

const AllocationPill = ({ color, label, percentage }: { color: string, label: string, percentage: string }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
    <span className={cn("w-2 h-2 rounded-full", color)}></span>
    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{label}</span>
    <span className="font-black text-[#0f172a] ml-auto">{percentage}</span>
  </div>
);

export default InvestorDashboard;
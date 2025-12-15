import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
  Target,
  Clock,
  Zap,
  Briefcase,
  Users,
  Calendar,
  Shield,
  ArrowLeftCircle,
  BarChart,
  ClipboardCheck,
} from "lucide-react";
import { Progress } from "@/components/ui/progress"; // Assuming you have a progress component

// --- Mock Data & Types (Reused from Dashboard) ---
interface InvestmentOpportunity {
  id: string;
  name: string;
  type: string;
  targetReturn: number;
  minInvestment: string;
  risk: "Low" | "Medium" | "High";
  status: "Open" | "Funding" | "Closed";
  durationMonths: number;
  fundsRaised: number; // in INR (lakhs)
  targetFund: number; // in INR (lakhs)
  keyMetrics: {
    irrHistory: number[]; // Placeholder for chart data
    avgGrowth: string;
    exitStrategy: string;
  };
  details: string;
}

// Detailed Mock Data (Simulates fetching from Firebase using the ID)
const mockOpportunityDetails: InvestmentOpportunity[] = [
  {
    id: "OP001",
    name: "Elite Shooter Fund Q4: High-Performance Tech Integration",
    type: "Seed Round - Equity",
    targetReturn: 35,
    minInvestment: "₹5,00,000",
    risk: "High",
    status: "Funding",
    durationMonths: 60,
    fundsRaised: 350,
    targetFund: 1000,
    keyMetrics: {
      irrHistory: [10, 15, 20, 25, 30, 35],
      avgGrowth: "+22% QoQ",
      exitStrategy: "Acquisition by major sports tech firm (3-5 years)",
    },
    details: "This fund is dedicated to scaling proprietary shooting analysis software and biometric feedback hardware. Funds will cover R&D, patent filing, and initial market penetration in three international territories. High risk, high reward targeting industry disruption.",
  },
  {
    id: "OP002",
    name: "National Training Center Expansion: Debt Financing",
    type: "Real Estate Debt",
    targetReturn: 12,
    minInvestment: "₹5,00,000",
    risk: "Medium",
    status: "Open",
    durationMonths: 48,
    fundsRaised: 120,
    targetFund: 500,
    keyMetrics: {
      irrHistory: [8, 9, 10, 11, 12, 12],
      avgGrowth: "+5% Annual Rental Yield",
      exitStrategy: "Debt repayment via center's operational income (4 years)",
    },
    details: "Secured debt financing for the construction of 10 new 50m ranges and accommodation facilities. The investment is secured against the physical assets and backed by guaranteed government contracts for national training camps.",
  },
];

// Helper functions (reused/adapted)
const formatCurrency = (amount: number, lakhs: boolean = true) => {
  if (lakhs) amount *= 100000; // Convert lakhs to actual INR
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const RiskTag = ({ risk }: { risk: "Low" | "Medium" | "High" }) => {
  let colorClass = "bg-gray-100 text-gray-700";
  if (risk === "High") colorClass = "bg-red-100 text-red-700";
  if (risk === "Medium") colorClass = "bg-amber-100 text-amber-700";
  if (risk === "Low") colorClass = "bg-green-100 text-green-700";

  return (
    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${colorClass}`}>
      <Shield className="w-4 h-4 inline mr-1" /> {risk} Risk
    </span>
  );
};

const DetailMetric = ({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) => (
    <div className="p-4 bg-slate-50 rounded-lg shadow-sm border border-slate-200">
        <div className={`flex items-center gap-2 mb-2 ${color}`}>
            {icon}
            <span className="text-xs font-semibold uppercase text-slate-600">{title}</span>
        </div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
    </div>
);


const OpportunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState<InvestmentOpportunity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Simulate API fetch based on ID
    const foundOpportunity = mockOpportunityDetails.find((op) => op.id === id);

    setTimeout(() => {
      setOpportunity(foundOpportunity || null);
      setLoading(false);
      // Ensure the user understands how the funds raised/targetFund are presented
      console.log('Opportunity loaded:', foundOpportunity); 
    }, 500);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-xl text-indigo-600">Loading opportunity details...</p>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="min-h-screen p-8 bg-slate-50">
        <Card className="max-w-4xl mx-auto shadow-lg border-red-500 border-2">
            <CardHeader>
                <CardTitle className="text-2xl text-red-600">Opportunity Not Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p>The investment opportunity with ID "{id}" could not be located.</p>
                <Button onClick={() => navigate('/investor/dashboard')} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                    <ArrowLeftCircle className="w-4 h-4 mr-2" /> Back to Dashboard
                </Button>
            </CardContent>
        </Card>
      </div>
    );
  }

  const fundingPercentage = Math.round((opportunity.fundsRaised / opportunity.targetFund) * 100);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        
        {/* Header/Back Button */}
        <Button 
            variant="ghost" 
            onClick={() => navigate(-1)} 
            className="mb-6 text-indigo-600 hover:bg-indigo-100"
        >
            <ArrowLeftCircle className="w-4 h-4 mr-2" /> Back to Dashboard
        </Button>

        {/* Main Content Card (Opportunity Overview) */}
        <Card className="shadow-xl border-t-4 border-indigo-600 bg-white/90 backdrop-blur-sm mb-8">
          <CardHeader className="p-6 md:p-8">
            <CardTitle className="text-3xl font-extrabold text-gray-900 flex justify-between items-start">
                <span>{opportunity.name}</span>
                <RiskTag risk={opportunity.risk} />
            </CardTitle>
            <CardDescription className="text-lg text-slate-600 mt-1">
                <span className="font-semibold text-indigo-700">{opportunity.type}</span> | Target Return: <span className="text-green-600 font-bold">{opportunity.targetReturn}% IRR</span>
            </CardDescription>
          </CardHeader>

          {/* Detailed Metrics Grid */}
          <CardContent className="p-6 md:p-8 pt-0">
            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-red-500" /> Investment Snapshot
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DetailMetric 
                    title="Min. Investment" 
                    value={opportunity.minInvestment} 
                    icon={<DollarSign className="w-5 h-5" />} 
                    color="text-indigo-600"
                />
                <DetailMetric 
                    title="Duration" 
                    value={`${opportunity.durationMonths} months`} 
                    icon={<Clock className="w-5 h-5" />} 
                    color="text-amber-600"
                />
                <DetailMetric 
                    title="Average Growth" 
                    value={opportunity.keyMetrics.avgGrowth} 
                    icon={<TrendingUp className="w-5 h-5" />} 
                    color="text-green-600"
                />
                <DetailMetric 
                    title="Current Status" 
                    value={opportunity.status} 
                    icon={<Zap className="w-5 h-5" />} 
                    color="text-purple-600"
                />
            </div>
            
            {/* Funding Progress Section */}
            <Card className="mt-8 shadow-md border-2 border-indigo-100 bg-indigo-50/50">
                <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-indigo-900">Funding Progress</span>
                        <span className="text-lg font-extrabold text-indigo-700">{fundingPercentage}% Funded</span>
                    </div>
                    <Progress value={fundingPercentage} className="h-3" />
                    <div className="flex justify-between text-xs text-indigo-700 mt-1">
                        <span>Raised: {formatCurrency(opportunity.fundsRaised)}</span>
                        <span>Target: {formatCurrency(opportunity.targetFund)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Opportunity Details / Exit Strategy */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <Card className="shadow-lg border-0 bg-white">
                    <CardHeader className="p-4 border-b border-slate-100">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-700">
                            <Briefcase className="w-4 h-4" /> Project Description
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 text-sm text-slate-700">
                        {opportunity.details}
                    </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-white">
                    <CardHeader className="p-4 border-b border-slate-100">
                        <CardTitle className="text-lg font-bold flex items-center gap-2 text-green-700">
                            <Target className="w-4 h-4" /> Exit Strategy
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 text-sm text-slate-700">
                        <p className="font-semibold">{opportunity.keyMetrics.exitStrategy}</p>
                        <p className="mt-2 text-xs text-slate-500">
                            Potential exit scenarios are regularly reviewed and communicated to investors.
                        </p>
                    </CardContent>
                </Card>
            </div>
          </CardContent>
          
          {/* Action Footer */}
          <CardFooter className="p-6 md:p-8 border-t border-slate-200 flex justify-between items-center bg-slate-50/50">
            <Button variant="outline" className="text-gray-600 hover:bg-white border-gray-300">
                <ClipboardCheck className="w-4 h-4 mr-2" /> Download Due Diligence Pack
            </Button>
            
            <Button 
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-lg px-8 py-3 shadow-xl"
                onClick={() => alert(`Initiating investment process for ${opportunity.name}`)}
                disabled={opportunity.status === 'Closed'}
            >
                {opportunity.status === 'Closed' ? 'Funding Closed' : 'Invest Now'}
            </Button>
          </CardFooter>

        </Card>
        
        {/* Placeholder for Dynamic Chart */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mt-8">
            <CardHeader className="border-b border-slate-100 p-4 md:p-6">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <BarChart className="w-5 h-5 text-blue-500" />
                    IRR Projection & Historic Growth
                </CardTitle>
                <CardDescription className="text-slate-600">
                    Projected performance based on financial modeling.
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 p-4 md:p-6">
                <div className="h-[250px] flex items-center justify-center bg-blue-50 border border-dashed rounded-lg text-slate-400">
                    [Placeholder: Line Chart showing Projected vs. Historical Internal Rate of Return (IRR)]
                </div>
                
            </CardContent>
        </Card>

      </main>
    </div>
  );
};

export default OpportunityDetail;
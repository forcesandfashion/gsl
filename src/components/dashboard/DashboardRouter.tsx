import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import ShooterDashboard from "./ShooterDashboard";
import RangeOwnerDashboard from "./RangeOwnerDashboard";
import AdminDashboard from "./AdminDashboard";
import ManagerDashboard from "./ManagerDashboard";
import { LoadingScreen } from "../ui/loading-spinner";
import ShooterProfile from "./ShooterProfile";
import RangeListOwners from "./RangeListOwners";
import RangeOwnerProfile from "./RangeOwnerProfile";
import EventDisplay from "./EventDisplay";
import RangeOwnerBookings from "./RangeOwnerBookings";
import BookingDetailsPage from "./BookingDetailsPage";
import ShooterBooking from "./ShooterBooking";
import ShooterEvents from "./ShooterEvents";
import RangeOwnerList from "./RangeOwnerList";
import Payment from "./Payment";
import AdminActiveRanges from "./AdminActiveRanges";
import UserDocumentsPage from "./UserDocumentsPage";
import PostRangeOwner from "./PostRangeOwner";
import AssistantAccounts from "./AssistantAccounts";
import DashboardShooterData from "./DashboardShooterData";
import AdminEventsPage from "./AdminEventsPage";
import SubAdminDashboard from "./SubAdminDasboard";
import SubAdminRangeOwners from "./SubAdminRangeOwners";
import SubAdminRanges from "./SubAdminRanges";
import SubAdminEvent from "./SubAdminEvent";
import SubAdminShooterData from "./SubAdminDashboardShooterData";
import CmbDashboard from "./CmbDashboard";
import CmbShooterData from "./CmbShooterData";
import CmbRanges from  "./CmbRanges";
import CmbBookings from "./CmbBookings";
import CmbEvents from "./CmbEvents";
import RangeOwnerShop from "./RangeOwnerShop";
import AdminProducts from "./AdminProducts";
import BillsAndSubscriptions from "./BillsAndSubscriptions";
import DeletionRequestComponent from "./DeletionRequestComponent";
import BillsSubscriptionsComponent from "./BillsSubscriptionsComponent";
import KYCRequests from "./KycRequests";
import BillsComponent from "./BillComponent";
import AttendanceComponent from "./AttendanceComponent";
import SubscriptionsComponent from "./SubscriptionComponent";
import SubAdminProducts from "./SubAdminProducts";
import TechnicalCoachDashboard from "./TechCoach";
import CoachProfilePage from "./TeachCoachProfile";
import InvestorDashboard from "./InvestorDashboard";
import OpportunityDetail from "./OpportunityDetail";
import CoachStudentDirectory from "./CoachList";
import InvestorProfilePage from "./InvestorProfile";
import CoachStudentManager from "./CoachStudentManager";
import StudentIntelPage from "./StudentIntelPage";
import HallOfFameManager from "./ShooterHallFame";

const DashboardRouter = () => {
  const { userRole, loading } = useAuth();
  
  // Debug: Log the userRole to see what's actually being returned
  console.log('Dashboard Router - userRole:', userRole);
  
  if (loading) {
    return <LoadingScreen text="Loading dashboard..." />;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          userRole === "admin" ? (
            <Navigate to="/dashboard/admin" replace />
          ) : userRole === "sub_admin" ? (
            <Navigate to="/dashboard/sub-admin" replace />
          ) : userRole === "franchise_owner" ? (
            <Navigate to="/dashboard/admin" replace />
          ) : userRole === "range_owner" ? (
            <Navigate to="/dashboard/range-owner" replace />
          ) : userRole === "manager" ? (
            <Navigate to="/dashboard/managers" replace />
          ) : userRole === "cmb" ? (
            <Navigate to="/dashboard/cmb" replace />
          ): userRole === "technical_coach" ? (
            <Navigate to="/dashboard/technical-coach" replace />
          ) : userRole === "dietician" ? (
            <Navigate to="/dashboard/managers" replace />
          ) : userRole === "mental_trainer" ? (
            <Navigate to="/dashboard/managers" replace />
          ) : userRole === "investor" ? (
            <Navigate to="/dashboard/investor" replace />
          ) : (
            <Navigate to="/dashboard/shooter" replace />
          )
        }
      />
      
      {/* Main dashboard routes */}
      <Route path="shooter" element={<ShooterDashboard />} />
      <Route path="range-owner" element={<RangeOwnerDashboard />} />
      <Route path="admin" element={<AdminDashboard />} />
      <Route path="managers" element={<ManagerDashboard />} />
      <Route path="cmb" element={<CmbDashboard />} />
      <Route path= "sub-admin" element={<SubAdminDashboard/>} />
      <Route path="technical-coach" element={<TechnicalCoachDashboard />} />
      <Route path="investor" element={<InvestorDashboard />} />


      {/* Sub admin sub routes */}
      <Route path ="sub-admin/range-owners" element={<SubAdminRangeOwners />} />
      <Route path="sub-admin/ranges" element={<SubAdminRanges />} />
      <Route path="sub-admin/events" element={<SubAdminEvent />} />
      <Route path="sub-admin/shooters-data" element={<SubAdminShooterData />} />
      <Route path="sub-admin/shop" element={<SubAdminProducts />} />
      <Route path="sub-admin/deletion-requests" element={<DeletionRequestComponent />} />
      <Route path="sub-admin/billing" element={<BillsSubscriptionsComponent />} />
      <Route path="sub-admin/kyc-requests" element={<KYCRequests />} />

      

      {/* Admin sub routes - Accessible by both admin and sub_admin */}
      <Route path="admin/range-owners" element={<RangeOwnerList />} />
      <Route path="admin/ranges" element={<AdminActiveRanges />} />
      <Route path="admin/shooter-data" element={<DashboardShooterData />} />
      <Route path="admin/events" element={<AdminEventsPage />} />
      <Route path="admin/shop" element={<AdminProducts />} />
      <Route path="admin/deletion-requests" element={<DeletionRequestComponent />} />
      <Route path="admin/billing" element={<BillsSubscriptionsComponent />} />
      <Route path="admin/kyc-requests" element={<KYCRequests />} />
      
      {/* Shooter sub-routes */}
      <Route path="shooter/bookings" element={<ShooterBooking />} />
      <Route path="shooter/coach-students" element={<CoachStudentDirectory />} />
      <Route path="shooter/events" element={<ShooterEvents />} />
      <Route path="shooter/hall-of-fame" element={<HallOfFameManager />} />
      <Route path="/documents" element={<UserDocumentsPage />} />
      
      
      {/* Range owner sub-routes */}
      <Route path="range-owner/my-ranges" element={<RangeListOwners />} />
      <Route path="range-owner/profile" element={<RangeOwnerProfile />} />
      <Route path="range-owner/events" element={<EventDisplay />} />
      <Route path="range-owner/billsAndsubscriptions" element={<BillsAndSubscriptions />} />
      <Route path="range-owner/bookings" element={<RangeOwnerBookings />} />
      <Route path="range-owner/bookings/:bookingId" element={<BookingDetailsPage />} />
      <Route path="range-owner/post-range-owner" element={<PostRangeOwner />} />
      <Route path="range-owner/assistant-accounts" element={<AssistantAccounts />} />
      <Route path="range-owner/subscription" element={<Payment />} />
      <Route path="range-owner/shop" element={<RangeOwnerShop />} />

      {/* TechCoach sub-routes */}
      <Route path="technical-coach/profile" element={<CoachProfilePage />} />
      <Route path="technical-coach/students" element={<CoachStudentManager />} />
      <Route path="technical-coach/student/:shooterId" element={<StudentIntelPage />} />
      {/* <Route path="technical-coach/bookings" element={<TechCoachBookings />} />
      <Route path="technical-coach/events" element={<TechCoachEvents />} />
      <Route path="technical-coach/documents" element={<TechCoachDocuments />} /> */}

      {/* Investor sub-routes */}
      <Route path="investor/opportunities/:opportunityId" element={<OpportunityDetail />} />
      <Route path="investor/profile" element={<InvestorProfilePage />} />

      {/* cmb sub path  */}
      <Route path="cmb/shooters-data" element={<CmbShooterData />} />
      <Route path="cmb/ranges" element={<CmbRanges />} />
      <Route path="cmb/cmb-bookings" element={<CmbBookings />} />
      <Route path="cmb/cmb-events" element={<CmbEvents />} />
      <Route path="cmb/bills" element={<BillsComponent />} />
      <Route path="cmb/subscriptions" element={<SubscriptionsComponent />} />
      <Route path="cmb/attendance" element={<AttendanceComponent />} />
      
      {/* Manager sub-routes */}
      {/* Add manager-specific routes here when needed:
      <Route path="managers/bookings" element={<ManagerBookings />} />
      <Route path="managers/events" element={<ManagerEvents />} />
      <Route path="managers/profile" element={<ManagerProfile />} />
      */}
    </Routes>
  );
};

export default DashboardRouter;
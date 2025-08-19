import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "@/firebase/auth";
import ShooterDashboard from "./ShooterDashboard";
import RangeOwnerDashboard from "./RangeOwnerDashboard";
import AdminDashboard from "./AdminDashboard";
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


const DashboardRouter = () => {
  const { userRole, loading } = useAuth();

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
          ) : userRole === "franchise_owner" ? (
            <Navigate to="/dashboard/admin" replace />
          ) : userRole === "range_owner" ? (
            <Navigate to="/dashboard/range-owner" replace />
          ) : (
            <Navigate to="/dashboard/shooter" replace />
          )
        }
      />
      <Route path="shooter" element={<ShooterDashboard />} />
      <Route path="range-owner" element={<RangeOwnerDashboard />} />
      <Route path="admin" element={<AdminDashboard />} />



      {/* Admin sub route */}
      <Route path="admin/range-owners" element={<RangeOwnerList />} />
      <Route path="admin/ranges" element={<AdminActiveRanges />} />
     
      {/* Shooter sub-routes */}
      <Route path="shooter/bookings" element={<ShooterBooking />} />
      <Route path="shooter/events" element={<ShooterEvents />} />

      {/* Range owner sub-routes */}
      <Route path="range-owner/my-ranges" element={<RangeListOwners />} />
      <Route path="range-owner/profile" element={<RangeOwnerProfile />} />
      <Route path="range-owner/events" element={<EventDisplay />} />
      <Route path="range-owner/bookings" element={<RangeOwnerBookings />} />
      <Route path="range-owner/bookings/:bookingId" element={<BookingDetailsPage />} />

      <Route path="range-owner/subscription" element={<Payment />} />
      {/* Add other range owner routes here as needed */}
    </Routes>
  );
};

export default DashboardRouter;
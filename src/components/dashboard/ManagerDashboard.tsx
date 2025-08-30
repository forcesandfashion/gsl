import {useState , useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import ActiveRanges from "./ActiveRanges";
import PendingRanges from "./PendingRanges";
import BlockedOwners from "./BlockedOwners";

export default function ManagerDashboard() {
    return (
        <div className="flex flex-col gap-4">
        </div>
    )
}
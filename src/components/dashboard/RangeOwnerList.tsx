import {useState, useEffect} from 'react';
import { Link } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useNavigate } from 'react-router-dom';
import ActiveRanges from './ActiveRanges';
import PendingRanges from './PendingRanges';
import BlockedOwners from './BlockedOwners';

export default function RangeOwnerList() {
    const [rangeOwners, setRangeOwners] = useState([]);
    const [loading, setLoading] = useState(true); 
    const [activeTab, setActiveTab] = useState("startup");   
    const navigate = useNavigate();
    useEffect(() => {
        async function fetchRangeOwners() {
            const rangeOwnersCollection = collection(db, "rangeOwners");
            const rangeOwnersSnapshot = await getDocs(rangeOwnersCollection);
            const rangeOwnersData = rangeOwnersSnapshot.docs.map((doc) => doc.data());
            setRangeOwners(rangeOwnersData);
            setLoading(false);
        }
        fetchRangeOwners();
    })
    return(
        <div>
            <header className="w-screen flex justify-between shadow-lg max-w-screen mx-auto p-6">
               <div><h1 className='text-5xl ml-10 text-blue-700 '>Range Owner List</h1></div> 
               <div> <h1 onClick={() => navigate("/dashboard/admin")} className='text-xl mr-5 pt-6 text-black hover:cursor-pointer hover:underline '>Go Back</h1></div> 
            </header>

            <div className="w-screen max-w-screen mx-auto mt-5">
              {/* Tab Buttons */}
              <div className="flex border-b border-gray-300">
                <button
                  onClick={() => setActiveTab("Active")}
                  className={`flex-1 py-2 text-center ${
                    activeTab === "Active"
                      ? "border-b-2 border-blue-500 text-blue-500 font-semibold"
                      : "text-gray-500 hover:text-blue-500"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setActiveTab("pending")}
                  className={`flex-1 py-2 text-center ${
                    activeTab === "pending"
                      ? "border-b-2 border-blue-500 text-blue-500 font-semibold"
                      : "text-gray-500 hover:text-blue-500"
                  }`}
                >
                  Pending
                </button>
                <button
                  onClick={() => setActiveTab("blocked")}
                  className={`flex-1 py-2 text-center ${
                    activeTab === "blocked"
                      ? "border-b-2 border-blue-500 text-blue-500 font-semibold"
                      : "text-gray-500 hover:text-blue-500"
                  }`}
                >
                  Blocked
                </button>
              </div>
              {/* Tab Content */}
              <div className="p-4 bg-white border border-gray-200 rounded-b-lg">
                {activeTab === "Active" && (
                  <ActiveRanges />
                  
                )}
                {activeTab === "pending" && (
                  <PendingRanges />

                 
                )}
                {activeTab === "blocked" && (
                  <BlockedOwners />

                 
                )}
                </div>
            </div>
              
            
            

        </div>
    )

}
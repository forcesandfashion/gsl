import { useState , useEffect } from 'react'
import { useNavigate } from 'react-router';
import { auth } from "../../firebase/config";
import { useAuth } from "@/firebase/auth";
import { signOut } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

export default function SubAdminDashboard() {
    const {user , signOut} = useAuth();
    const navigate = useNavigate();
    return (
        <div>
            <div className='flex justify-between p-5 border border-black '>
                <h1 className='text-4xl px-2'>Sub-Admin</h1>
                <div className='flex gap-4'>
                    <h1 className='text-2xl mt-2'>{user?.displayName?.split(' | ')[0] || user?.email}</h1> 
                    <button onClick={signOut} className='bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded'>Sign Out</button>

                </div>
            </div>
            <div className='grid grid-cols-4 gap-4 p-5 mt-7 '>
                <Card
                className='border border-black'>
                    <CardHeader>
                        <CardTitle>Projects</CardTitle>
                        <CardDescription>Manage your projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Project management interface will be implemented here.</p>
                    </CardContent>
                </Card>

                <Card
                className='border border-black  cursor-pointer'
                onClick={() => navigate('/dashboard/sub-admin/range-owners')}>
                    <CardHeader>
                        <CardTitle>Range Owners</CardTitle>
                        <CardDescription>Manage your projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Registered range owners will be displayed here</p>
                    </CardContent>
                </Card>
                <Card
                className='border border-black  cursor-pointer'
                onClick={() => navigate('/dashboard/sub-admin/ranges')}>
                    <CardHeader>
                        <CardTitle>Ranges</CardTitle>
                        <CardDescription>Manage your projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Ranges can be managed here.</p>
                    </CardContent>
                </Card>
                <Card
                className='border border-black  cursor-pointer'
                onClick={() => navigate('/dashboard/sub-admin/ranges')}>
                    <CardHeader>
                        <CardTitle>Events</CardTitle>
                        <CardDescription>Manage your projects</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p>Manage your events here</p>
                    </CardContent>
                </Card>
                
            </div>
        </div>
    )
}
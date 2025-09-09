import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { auth } from "../../firebase/config"
import { useAuth } from "@/firebase/auth"
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy, Timestamp, Unsubscribe } from 'firebase/firestore'
import { db } from "../../firebase/config"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { Users, Target, Calendar, MapPin, Plus, X, Eye, EyeOff, Trash2, AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react'

// TypeScript Interfaces
interface User {
  uid: string
  email: string | null
  displayName: string | null
  getIdToken: () => Promise<string>
}

interface CmbAccount {
  id: string
  username: string
  email: string
  status: 'active' | 'inactive' | 'suspended' | 'deleted'
  createdAt?: string
  createdBy?: string
  createdByRole?: 'admin' | 'sub_admin'
  lastLogin?: string | null
  loginCount?: number
  updatedAt?: string
  statusUpdatedAt?: string
  statusUpdatedBy?: string
}

interface Shooter {
  id: string
  createdAt: Timestamp
  // Add other shooter fields as needed
}

interface Booking {
  id: string
  createdAt: Timestamp
  // Add other booking fields as needed
}

interface FormData {
  username: string
  email: string
  password: string
}

interface ChartDataPoint {
  name: string
  shooters?: number
  bookings?: number
}

interface BookingsData {
  week: ChartDataPoint[]
  month: ChartDataPoint[]
  year: ChartDataPoint[]
}

interface ApiResponse {
  success: boolean
  message?: string
  error?: string
  cmbAccountId?: string
  username?: string
  email?: string
  deletedAccount?: {
    id: string
    username: string
    email: string
  }
}

interface UpdatingStatus {
  [accountId: string]: boolean
}

type TimeFrame = 'week' | 'month' | 'year'
// Fixed: Updated AccountStatus to include 'deleted' and match CmbAccount.status
type AccountStatus = 'active' | 'inactive' | 'suspended' | 'deleted'

export default function SubAdminDashboard(): JSX.Element {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  
  // State with proper typing
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('month')
  const [loading, setLoading] = useState<boolean>(false)
  const [cmbAccounts, setCmbAccounts] = useState<CmbAccount[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [updatingStatus, setUpdatingStatus] = useState<UpdatingStatus>({})
  const [shootersData, setShootersData] = useState<ChartDataPoint[]>([])
  const [bookingsData, setBookingsData] = useState<BookingsData>({
    week: [],
    month: [],
    year: []
  })
  const [formData, setFormData] = useState<FormData>({
    username: '',
    email: '',
    password: ''
  })

  // Cloud Functions API calls (only for create and delete)
  const API_BASE_URL: string = ' https://us-central1-global-shooting-league.cloudfunctions.net' // Replace with your actual Cloud Functions URL

  const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}): Promise<Response> => {
    if (!user) throw new Error('No authenticated user')
    
    const idToken: string = await user.getIdToken()
    return fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
  }

  // Fetch shooters data for chart
  useEffect((): (() => void) | void => {
    if (!user) return

    try {
      const shootersQuery = query(
        collection(db, 'shooters'),
        orderBy('createdAt', 'desc')
      )

      const unsubscribe: Unsubscribe = onSnapshot(shootersQuery, 
        (querySnapshot) => {
          const shootersByMonth: { [key: string]: number } = {}
          const currentDate = new Date()
          
          // Initialize last 6 months
          for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
            const monthKey = date.toLocaleDateString('en-US', { month: 'short' })
            shootersByMonth[monthKey] = 0
          }

          querySnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.createdAt) {
              const createdDate = data.createdAt.toDate()
              const monthKey = createdDate.toLocaleDateString('en-US', { month: 'short' })
              if (shootersByMonth.hasOwnProperty(monthKey)) {
                shootersByMonth[monthKey]++
              }
            }
          })

          const chartData: ChartDataPoint[] = Object.entries(shootersByMonth).map(([month, count]) => ({
            name: month,
            shooters: count
          }))

          setShootersData(chartData)
        },
        (err: Error) => {
          console.error('Error fetching shooters data:', err)
        }
      )

      return () => unsubscribe()
    } catch (err) {
      console.error('Error setting up shooters listener:', err)
    }
  }, [user])

  // Fetch bookings data for chart
  useEffect((): (() => void) | void => {
    if (!user) return

    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        orderBy('createdAt', 'desc')
      )

      const unsubscribe: Unsubscribe = onSnapshot(bookingsQuery, 
        (querySnapshot) => {
          const currentDate = new Date()
          
          // Week data (last 7 days)
          const weekData: { [key: string]: number } = {}
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
          for (let i = 6; i >= 0; i--) {
            const date = new Date(currentDate)
            date.setDate(date.getDate() - i)
            const dayKey = dayNames[date.getDay()]
            weekData[dayKey] = 0
          }

          // Month data (last 4 weeks)
          const monthData: { [key: string]: number } = {
            'Week 1': 0,
            'Week 2': 0,
            'Week 3': 0,
            'Week 4': 0
          }

          // Year data (last 6 months)
          const yearData: { [key: string]: number } = {}
          for (let i = 5; i >= 0; i--) {
            const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
            const monthKey = date.toLocaleDateString('en-US', { month: 'short' })
            yearData[monthKey] = 0
          }

          querySnapshot.forEach((doc) => {
            const data = doc.data()
            if (data.createdAt) {
              const createdDate = data.createdAt.toDate()
              
              // Week calculation
              const daysDiff = Math.floor((currentDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
              if (daysDiff >= 0 && daysDiff < 7) {
                const dayKey = dayNames[createdDate.getDay()]
                weekData[dayKey]++
              }

              // Month calculation (last 4 weeks)
              if (daysDiff >= 0 && daysDiff < 28) {
                const weekNumber = Math.floor(daysDiff / 7) + 1
                if (weekNumber <= 4) {
                  monthData[`Week ${weekNumber}`]++
                }
              }

              // Year calculation
              const monthKey = createdDate.toLocaleDateString('en-US', { month: 'short' })
              if (yearData.hasOwnProperty(monthKey)) {
                yearData[monthKey]++
              }
            }
          })

          const newBookingsData: BookingsData = {
            week: Object.entries(weekData).map(([day, count]) => ({
              name: day,
              bookings: count
            })),
            month: Object.entries(monthData).map(([week, count]) => ({
              name: week,
              bookings: count
            })),
            year: Object.entries(yearData).map(([month, count]) => ({
              name: month,
              bookings: count
            }))
          }

          setBookingsData(newBookingsData)
        },
        (err: Error) => {
          console.error('Error fetching bookings data:', err)
        }
      )

      return () => unsubscribe()
    } catch (err) {
      console.error('Error setting up bookings listener:', err)
    }
  }, [user])

  // Fetch CMB accounts directly from Firestore with real-time updates
  useEffect((): (() => void) | void => {
    if (!user) return

    setIsLoading(true)
    setError('')

    try {
      // Create query for active CMB accounts (excluding deleted ones)
      const cmbQuery = query(
        collection(db, 'cmb'),
        where('status', 'in', ['active', 'inactive', 'suspended'] as AccountStatus[]),
        
      )

      // Set up real-time listener
      const unsubscribe: Unsubscribe = onSnapshot(cmbQuery, 
        (querySnapshot) => {
          const accounts: CmbAccount[] = []
          querySnapshot.forEach((doc) => {
            const data = doc.data()
            accounts.push({
              id: doc.id,
              username: data.username,
              email: data.email,
              status: data.status as AccountStatus,
              createdAt: data.createdAt?.toDate().toISOString(),
              createdBy: data.createdBy,
              createdByRole: data.createdByRole as 'admin' | 'sub_admin',
              lastLogin: data.lastLogin?.toDate().toISOString() || null,
              loginCount: data.loginCount || 0,
              updatedAt: data.updatedAt?.toDate().toISOString(),
              statusUpdatedAt: data.statusUpdatedAt?.toDate().toISOString(),
              statusUpdatedBy: data.statusUpdatedBy
            })
          })
          setCmbAccounts(accounts)
          setIsLoading(false)
        },
        (err: Error) => {
          console.error('Error fetching CMB accounts:', err)
          console.error('Error details:', {
            code: (err as any).code,
            message: err.message,
            stack: err.stack
          })
          setError('Failed to fetch CMB accounts: ' + err.message)
          setIsLoading(false)
        }
      )

      // Cleanup subscription on unmount
      return () => unsubscribe()
    } catch (err) {
      console.error('Error setting up CMB accounts listener:', err)
      setError('Failed to set up real-time updates: ' + (err as Error).message)
      setIsLoading(false)
    }
  }, [user])

  // Create CMB account using cloud function
  const handleCreateAccount = async (): Promise<void> => {
    if (!formData.username || !formData.email || !formData.password) {
      setError('All fields are required')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const response: Response = await makeAuthenticatedRequest(`${API_BASE_URL}/createCmbAccount`, {
        method: 'POST',
        body: JSON.stringify(formData)
      })

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create CMB account')
      }

      setSuccess('CMB account created successfully!')
      setFormData({ username: '', email: '', password: '' })
      setIsModalOpen(false)

    } catch (err) {
      console.error('Error creating CMB account:', err)
      setError((err as Error).message || 'Failed to create CMB account')
    } finally {
      setLoading(false)
    }
  }

  // Delete CMB account using cloud function
  const handleDeleteAccount = async (accountId: string, username: string): Promise<void> => {
    if (!confirm(`Are you sure you want to delete the CMB account "${username}"? This action cannot be undone.`)) {
      return
    }

    try {
      setError('')
      setSuccess('')

      const response: Response = await makeAuthenticatedRequest(`${API_BASE_URL}/deleteCmbAccount`, {
        method: 'POST',
        body: JSON.stringify({ cmbAccountId: accountId })
      })

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete CMB account')
      }

      setSuccess(`CMB account "${username}" deleted successfully!`)

    } catch (err) {
      console.error('Error deleting CMB account:', err)
      setError((err as Error).message || 'Failed to delete CMB account')
    }
  }

  // Update account status directly in Firestore
  const handleStatusUpdate = async (accountId: string, newStatus: Exclude<AccountStatus, 'deleted'>): Promise<void> => {
    if (!user) return

    try {
      setUpdatingStatus(prev => ({ ...prev, [accountId]: true }))
      setError('')
      setSuccess('')

      const accountRef = doc(db, 'cmb', accountId)
      await updateDoc(accountRef, {
        status: newStatus,
        statusUpdatedAt: new Date(),
        statusUpdatedBy: user.uid,
        updatedAt: new Date()
      })

      setSuccess(`Account status updated to ${newStatus}!`)

    } catch (err) {
      console.error('Error updating account status:', err)
      setError((err as Error).message || 'Failed to update account status')
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [accountId]: false }))
    }
  }

  // Auto-clear messages
  useEffect((): (() => void) | void => {
    if (success || error) {
      const timer: NodeJS.Timeout = setTimeout(() => {
        setSuccess('')
        setError('')
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [success, error])

  const getStatusColor = (status: AccountStatus): string => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100'
      case 'inactive': return 'text-gray-600 bg-gray-100'
      case 'suspended': return 'text-red-600 bg-red-100'
      case 'deleted': return 'text-red-800 bg-red-200'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: AccountStatus): JSX.Element => {
    switch (status) {
      case 'active': return <CheckCircle size={16} />
      case 'inactive': return <Clock size={16} />
      case 'suspended': return <AlertCircle size={16} />
      case 'deleted': return <X size={16} />
      default: return <Clock size={16} />
    }
  }

  const handleFormChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const value = field === 'username' ? e.target.value.toLowerCase() : e.target.value
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleModalClose = (): void => {
    setIsModalOpen(false)
    setFormData({ username: '', email: '', password: '' })
    setError('')
    setSuccess('')
  }

  const handleStatusChange = (accountId: string) => (
    e: React.ChangeEvent<HTMLSelectElement>
  ): void => {
    const newStatus = e.target.value as Exclude<AccountStatus, 'deleted'>
    handleStatusUpdate(accountId, newStatus)
  }

  const handleTimeFrameChange = (period: TimeFrame): void => {
    setTimeFrame(period)
  }

  const handleNavigate = (path: string): void => {
    navigate(path)
  }

  const handleSignOut = async (): Promise<void> => {
    try {
      await signOut()
    } catch (err) {
      console.error('Error signing out:', err)
      setError('Failed to sign out. Please try again.')
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800">Sub-Admin Dashboard</h1>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <h2 className="text-lg sm:text-xl text-gray-600">
              {user?.displayName?.split(' | ')[0] || user?.email}
            </h2>
            <button 
              onClick={handleSignOut}
              className="bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition-colors duration-200 shadow-md"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Alert Messages */}
      {(success || error) && (
        <div className="p-4">
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
              <CheckCircle size={20} />
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex items-center gap-2">
              <AlertCircle size={20} />
              {error}
            </div>
          )}
        </div>
      )}

      <div className="p-4 sm:p-6 space-y-8">
        {/* Management Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <Card className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 cursor-pointer transform hover:-translate-y-1"
            onClick={() => handleNavigate('/dashboard/sub-admin/shooters-data')}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800">Shooters Data</CardTitle>
                <Target className="h-6 w-6 text-blue-500" />
              </div>
              <CardDescription className="text-gray-600">Manage Shooters Data here</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">View and manage shooters data</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 cursor-pointer transform hover:-translate-y-1"
            onClick={() => handleNavigate('/dashboard/sub-admin/range-owners')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800">Range Owners</CardTitle>
                <Users className="h-6 w-6 text-green-500" />
              </div>
              <CardDescription className="text-gray-600">Manage range owners</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">View registered range owners</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 cursor-pointer transform hover:-translate-y-1"
            onClick={() => handleNavigate('/dashboard/sub-admin/ranges')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800">Ranges</CardTitle>
                <MapPin className="h-6 w-6 text-purple-500" />
              </div>
              <CardDescription className="text-gray-600">Manage shooting ranges</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Configure and manage ranges</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 cursor-pointer transform hover:-translate-y-1"
            onClick={() => handleNavigate('/dashboard/sub-admin/events')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-800">Events</CardTitle>
                <Calendar className="h-6 w-6 text-orange-500" />
              </div>
              <CardDescription className="text-gray-600">Manage events</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">Create and manage events</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shooters Growth Chart */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800">Shooter Account Growth</CardTitle>
              <CardDescription className="text-gray-600">New shooter registrations over time (Real Data)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={shootersData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="shooters" 
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.1}
                    strokeWidth={3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Bookings Chart */}
          <Card className="bg-white shadow-lg border-0">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl font-semibold text-gray-800">Booking Analytics</CardTitle>
                  <CardDescription className="text-gray-600">Booking trends by time period (Real Data)</CardDescription>
                </div>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {(['week', 'month', 'year'] as TimeFrame[]).map((period: TimeFrame) => (
                    <button
                      key={period}
                      onClick={() => handleTimeFrameChange(period)}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors duration-200 ${
                        timeFrame === period
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bookingsData[timeFrame]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#f8fafc', 
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="bookings" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* CMB Accounts Section */}
        <Card className="bg-white shadow-lg border-0">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle className="text-2xl font-semibold text-gray-800">CMB Accounts</CardTitle>
                <CardDescription className="text-gray-600">
                  Manage CMB user accounts ({cmbAccounts.length} total)
                  <span className="text-green-600 ml-2">• Live updates</span>
                </CardDescription>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors duration-200 shadow-md"
              >
                <Plus size={20} />
                Add Account
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className="ml-2 text-gray-600">Loading accounts...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Username</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Email</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Status</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Created At</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Last Login</th>
                      <th className="text-left py-3 px-2 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cmbAccounts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No CMB accounts found. Create your first account above.
                        </td>
                      </tr>
                    ) : (
                      cmbAccounts.map((account: CmbAccount) => (
                        <tr key={account.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-2 text-gray-800 font-medium">{account.username}</td>
                          <td className="py-3 px-2 text-gray-600">{account.email}</td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(account.status)}`}>
                                {getStatusIcon(account.status)}
                                {account.status}
                              </span>
                              {account.status !== 'deleted' && (
                                <div className="relative">
                                  <select
                                    value={account.status}
                                    onChange={handleStatusChange(account.id)}
                                    disabled={updatingStatus[account.id]}
                                    className="ml-2 text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                  >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                  </select>
                                  {updatingStatus[account.id] && (
                                    <RefreshCw className="absolute right-1 top-1.5 h-3 w-3 animate-spin text-blue-500" />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-600 text-sm">
                            {account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3 px-2 text-gray-600 text-sm">
                            {account.lastLogin ? new Date(account.lastLogin).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-3 px-2">
                            <button
                              onClick={() => handleDeleteAccount(account.id, account.username)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded-full transition-colors duration-200"
                              title={`Delete ${account.username}`}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal for Adding CMB Account */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">Create CMB Account</h3>
              <button
                onClick={handleModalClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={handleFormChange('username')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter username (letters, numbers, underscore only)"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">Only letters, numbers, and underscores allowed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleFormChange('email')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter email address"
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleFormChange('password')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-10"
                    placeholder="Enter password (minimum 6 characters)"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long</p>
              </div>
              
              {/* Modal Error/Success Messages */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm flex items-center gap-2">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm flex items-center gap-2">
                  <CheckCircle size={16} />
                  {success}
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={handleModalClose}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAccount}
                disabled={loading || !formData.username || !formData.email || !formData.password}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
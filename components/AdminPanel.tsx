
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { getAdminStats, getUserActivityLogs, generateAdminReport, getExpiredUsers, sendRenewalEmails, updateUserProfileAdmin, deleteUserAdmin } from '../services/adminService';

interface AdminPanelProps {
  user: User | null;
  onNavigate: (view: 'home') => void;
}

const ADMIN_EMAILS = ['jurniqcareers@gmail.com', 'chairman@balitandsons.com'];

const AdminPanel: React.FC<AdminPanelProps> = ({ user, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'financials' | 'settings' | 'authors'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // User Management State
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  
  // Drilldown State
  const [viewingUserLogs, setViewingUserLogs] = useState<any | null>(null);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // AI & Actions
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [expiredUsers, setExpiredUsers] = useState<any[]>([]);
  const [sendingEmails, setSendingEmails] = useState(false);

  // Chart Refs
  const trafficChartRef = useRef<HTMLCanvasElement>(null);
  const demoChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstances = useRef<any[]>([]);

  // Helper for date formatting
  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleString();
  };

  // Auth Check
  useEffect(() => {
    if (!user || !user.email || !ADMIN_EMAILS.includes(user.email)) {
      onNavigate('home');
    }
  }, [user]);

  // Data Fetching
  const loadData = async () => {
      setLoading(true);
      const data = await getAdminStats();
      setStats(data);
      setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Chart Rendering
  useEffect(() => {
    if (!stats || !window.Chart) return;

    // Cleanup
    chartInstances.current.forEach(c => c.destroy());
    chartInstances.current = [];

    // 1. Traffic Chart (Line)
    if (trafficChartRef.current && activeTab === 'overview') {
        const ctx = trafficChartRef.current.getContext('2d');
        if (ctx) {
            const chart = new window.Chart(ctx, {
                type: 'line',
                data: {
                    labels: stats.chartData.map((d: any) => d.date),
                    datasets: [
                        { label: 'Visits', data: stats.chartData.map((d: any) => d.visits), borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)', fill: true, tension: 0.4 },
                        { label: 'Clicks', data: stats.chartData.map((d: any) => d.clicks), borderColor: '#8b5cf6', backgroundColor: 'rgba(139, 92, 246, 0.1)', fill: true, tension: 0.4 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
                    scales: { y: { beginAtZero: true, grid: { color: '#f3f4f6' } }, x: { grid: { display: false } } }
                }
            });
            chartInstances.current.push(chart);
        }
    }

    // 2. Demographics Chart (Doughnut)
    if (demoChartRef.current && activeTab === 'overview') {
        const ctx = demoChartRef.current.getContext('2d');
        if (ctx) {
            const chart = new window.Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Student', 'Teacher', 'Parent', 'Basic'],
                    datasets: [{
                        data: [stats.demographics.student, stats.demographics.teacher, stats.demographics.parent, stats.demographics.basic],
                        backgroundColor: ['#3b82f6', '#8b5cf6', '#f59e0b', '#9ca3af'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: { legend: { position: 'right' } }
                }
            });
            chartInstances.current.push(chart);
        }
    }
  }, [stats, activeTab]);

  // --- Actions ---

  const handleUpdateUser = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!editingUser) return;
      setSavingUser(true);

      const formData = new FormData(e.target as HTMLFormElement);
      const updates = {
          name: formData.get('name'),
          phone: formData.get('phone'),
          subscription_model: formData.get('subscription_model'),
          is_subscribed: formData.get('status') === 'active',
          subscription_status: formData.get('status'),
          // Handle date carefully
          renewal_date: formData.get('renewal_date') ? new Date(formData.get('renewal_date') as string) : null
      };

      const res = await updateUserProfileAdmin(editingUser.id, updates);
      if (res.success) {
          alert("User updated successfully");
          setEditingUser(null);
          loadData(); // Refresh list
      } else {
          alert("Failed to update user");
      }
      setSavingUser(false);
  };

  const handleDeleteUser = async () => {
      if (!editingUser) return;
      if (!window.confirm(`Are you sure you want to PERMANENTLY DELETE ${editingUser.name}? This cannot be undone.`)) return;
      
      const res = await deleteUserAdmin(editingUser.id);
      if (res.success) {
          alert("User deleted.");
          setEditingUser(null);
          loadData();
      } else {
          alert("Delete failed.");
      }
  };

  const handleGenerateAIReport = async () => {
      if (!stats) return;
      setGeneratingReport(true);
      const report = await generateAdminReport(stats);
      setAiReport(report);
      setGeneratingReport(false);
  };

  const handleRunRenewalCheck = async () => {
    setSendingEmails(true);
    const expired = await getExpiredUsers();
    setExpiredUsers(expired);
    setSendingEmails(false);
    setShowRenewalModal(true);
  };

  const handleSendEmails = async () => {
      if (expiredUsers.length === 0) return;
      setSendingEmails(true);
      const result: any = await sendRenewalEmails(expiredUsers);
      setSendingEmails(false);
      alert(`Sent ${result.count} emails.`);
      setShowRenewalModal(false);
  };

  const handleViewLogs = async (user: any) => {
      setViewingUserLogs(user);
      setLoadingLogs(true);
      const logs = await getUserActivityLogs(user.id);
      setUserLogs(logs);
      setLoadingLogs(false);
  };

  // --- Filtering Users ---
  const filteredUsers = stats?.users.filter((u: any) => 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><div className="loader"></div></div>;

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex flex-col md:flex-row">
        
        {/* SIDEBAR */}
        <aside className="w-full md:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0">
            <div className="p-6 flex items-center gap-3 border-b border-slate-800">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold">J</div>
                <span className="font-bold text-lg tracking-wide">AdminOS</span>
            </div>
            <nav className="flex-1 p-4 space-y-2">
                <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <i className="fas fa-chart-pie w-5"></i> Overview
                </button>
                <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <i className="fas fa-users w-5"></i> User Management
                </button>
                <button onClick={() => setActiveTab('financials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'financials' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <i className="fas fa-wallet w-5"></i> Financials
                </button>
                <button onClick={() => setActiveTab('authors')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'authors' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                    <i className="fas fa-pen-nib w-5"></i> Blog Authors
                </button>
            </nav>
            <div className="p-4 border-t border-slate-800">
                <button onClick={() => onNavigate('home')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white transition-colors">
                    <i className="fas fa-sign-out-alt w-5"></i> Exit to App
                </button>
            </div>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto h-screen">
            {/* Header */}
            <header className="bg-white shadow-sm border-b px-8 py-4 flex justify-between items-center sticky top-0 z-20">
                <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab}</h2>
                <div className="flex gap-3">
                    <button onClick={handleRunRenewalCheck} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 shadow-sm flex items-center gap-2">
                        <i className="fas fa-envelope"></i> Renewals
                    </button>
                    <button onClick={handleGenerateAIReport} disabled={generatingReport} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-lg flex items-center gap-2">
                        {generatingReport ? <div className="loader !w-3 !h-3 !border-2"></div> : <i className="fas fa-robot"></i>} AI Analyst
                    </button>
                </div>
            </header>

            <div className="p-8">
                
                {/* AI REPORT COMPONENT */}
                {aiReport && (
                    <div className="mb-8 bg-white p-6 rounded-2xl shadow-lg border border-indigo-100 animate-fade-in-up">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><i className="fas fa-sparkles text-yellow-500"></i> Executive Summary</h3>
                            <button onClick={() => setAiReport(null)} className="text-gray-400 hover:text-red-500">&times;</button>
                        </div>
                        <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: aiReport }}></div>
                    </div>
                )}

                {/* --- TAB: OVERVIEW --- */}
                {activeTab === 'overview' && (
                    <div className="space-y-8 animate-fade-in-up">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><i className="fas fa-users text-6xl text-blue-600"></i></div>
                                <p className="text-sm font-medium text-gray-500">Total Users</p>
                                <h3 className="text-3xl font-extrabold text-gray-800 mt-1">{stats.totalUsers}</h3>
                                <p className="text-xs text-green-600 mt-2 font-medium bg-green-50 inline-block px-2 py-1 rounded">+{stats.newUsersLast30Days} in last 30d</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><i className="fas fa-rupee-sign text-6xl text-green-600"></i></div>
                                <p className="text-sm font-medium text-gray-500">Total Revenue</p>
                                <h3 className="text-3xl font-extrabold text-gray-800 mt-1">₹{stats.totalRevenue.toLocaleString()}</h3>
                                <p className="text-xs text-gray-400 mt-2 font-medium">Lifetime value</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><i className="fas fa-crown text-6xl text-yellow-500"></i></div>
                                <p className="text-sm font-medium text-gray-500">Active Subscriptions</p>
                                <h3 className="text-3xl font-extrabold text-gray-800 mt-1">{stats.activeSubs}</h3>
                                <p className="text-xs text-blue-600 mt-2 font-medium">{stats.retentionRate}% Retention Rate</p>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity"><i className="fas fa-mouse-pointer text-6xl text-purple-500"></i></div>
                                <p className="text-sm font-medium text-gray-500">Total Interactions</p>
                                <h3 className="text-3xl font-extrabold text-gray-800 mt-1">{stats.totalClicks}</h3>
                                <p className="text-xs text-purple-600 mt-2 font-medium">{stats.totalVisits} sessions</p>
                            </div>
                        </div>

                        {/* Charts Area */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-6">Traffic Analysis</h3>
                                <div className="h-80 w-full"><canvas ref={trafficChartRef}></canvas></div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h3 className="font-bold text-gray-800 mb-6">User Demographics</h3>
                                <div className="h-64 w-full relative"><canvas ref={demoChartRef}></canvas></div>
                                <div className="mt-6 space-y-2">
                                    <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Student</span> <span className="font-bold">{stats.demographics.student}</span></div>
                                    <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Teacher</span> <span className="font-bold">{stats.demographics.teacher}</span></div>
                                    <div className="flex justify-between text-sm"><span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Parent</span> <span className="font-bold">{stats.demographics.parent}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: USERS --- */}
                {activeTab === 'users' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in-up">
                        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4">
                            <h3 className="font-bold text-lg text-gray-800">User Database ({stats.users.length})</h3>
                            <div className="relative w-full sm:w-64">
                                <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                                <input 
                                    type="text" 
                                    placeholder="Search users..." 
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-gray-600">
                                <thead className="bg-gray-50 text-gray-700 font-semibold uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4">Plan</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Created</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.slice(0, 50).map((u: any) => (
                                        <tr key={u.id} className="hover:bg-gray-50 transition">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{u.name}</div>
                                                <div className="text-xs text-gray-400">{u.email}</div>
                                            </td>
                                            <td className="px-6 py-4 capitalize">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                    u.subscription_model === 'student' ? 'bg-blue-100 text-blue-700' :
                                                    u.subscription_model === 'teacher' ? 'bg-purple-100 text-purple-700' :
                                                    u.subscription_model === 'parent' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100'
                                                }`}>{u.subscription_model || 'Basic'}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {u.is_subscribed 
                                                    ? <span className="flex items-center gap-1 text-green-600 font-bold text-xs"><span className="w-2 h-2 rounded-full bg-green-600"></span> Active</span>
                                                    : <span className="flex items-center gap-1 text-gray-400 text-xs"><span className="w-2 h-2 rounded-full bg-gray-400"></span> Inactive</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4 text-xs">
                                                {u.createdAt ? new Date(u.createdAt.seconds * 1000).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-2">
                                                <button onClick={() => handleViewLogs(u)} className="text-gray-400 hover:text-blue-600" title="View Logs"><i className="fas fa-history"></i></button>
                                                <button onClick={() => setEditingUser(u)} className="text-gray-400 hover:text-indigo-600" title="Edit User"><i className="fas fa-edit"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && <p className="text-center p-8 text-gray-500">No users found.</p>}
                        </div>
                    </div>
                )}

                {/* --- TAB: FINANCIALS --- */}
                {/* --- TAB: FINANCIALS --- */}
                {activeTab === 'financials' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                            <h3 className="text-2xl font-bold text-gray-800 mb-6">Revenue Breakdown</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="p-6 bg-blue-50 rounded-xl border border-blue-100">
                                    <p className="text-sm font-bold text-blue-700 uppercase">Student Revenue</p>
                                    <p className="text-3xl font-extrabold text-blue-900 mt-2">₹{stats.revenueBreakdown.student.toLocaleString()}</p>
                                </div>
                                <div className="p-6 bg-purple-50 rounded-xl border border-purple-100">
                                    <p className="text-sm font-bold text-purple-700 uppercase">Teacher Revenue</p>
                                    <p className="text-3xl font-extrabold text-purple-900 mt-2">₹{stats.revenueBreakdown.teacher.toLocaleString()}</p>
                                </div>
                                <div className="p-6 bg-orange-50 rounded-xl border border-orange-100">
                                    <p className="text-sm font-bold text-orange-700 uppercase">Parent Revenue</p>
                                    <p className="text-3xl font-extrabold text-orange-900 mt-2">₹{stats.revenueBreakdown.parent.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- TAB: AUTHORS --- */}
                {activeTab === 'authors' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold text-gray-800">Blog Authors</h3>
                            </div>
                            <p className="text-gray-600 mb-6">Manage users who have permission to write and publish blogs. Admins automatically have access.</p>
                            
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 mb-8">
                                <h4 className="font-bold text-blue-900 mb-2">Add New Author</h4>
                                <form onSubmit={async (e) => {
                                    e.preventDefault();
                                    const form = e.target as HTMLFormElement;
                                    const email = (form.elements.namedItem('email') as HTMLInputElement).value;
                                    
                                    // Find user by email
                                    const userToAdd = stats?.users.find((u: any) => u.email === email);
                                    if (!userToAdd) {
                                        alert('User not found. They must register an account first.');
                                        return;
                                    }
                                    
                                    try {
                                        const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
                                        const { db } = await import('../services/firebaseService');
                                        await setDoc(doc(db, 'authors', userToAdd.id), {
                                            email: userToAdd.email,
                                            name: userToAdd.name || userToAdd.email.split('@')[0],
                                            addedAt: serverTimestamp()
                                        });
                                        alert('Author added successfully!');
                                        form.reset();
                                    } catch (err) {
                                        console.error(err);
                                        alert('Failed to add author.');
                                    }
                                }} className="flex gap-4">
                                    <input type="email" name="email" required placeholder="Enter user's email address" className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
                                    <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors">Grant Access</button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </main>

        {/* --- EDIT USER MODAL --- */}
        {editingUser && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 relative animate-bounce-in">
                    <button onClick={() => setEditingUser(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
                    <h3 className="text-2xl font-bold text-gray-800 mb-6">Edit User Profile</h3>
                    
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Name</label>
                                <input name="name" defaultValue={editingUser.name} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-700 mb-1">Phone</label>
                                <input name="phone" defaultValue={editingUser.phone} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1">Email (Read Only)</label>
                            <input value={editingUser.email} disabled className="w-full border rounded-lg p-2.5 text-sm bg-gray-100 text-gray-500 cursor-not-allowed" />
                        </div>
                        
                        <div className="border-t pt-4 mt-4">
                            <h4 className="font-bold text-gray-800 mb-3 text-sm">Subscription Override</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Plan</label>
                                    <select name="subscription_model" defaultValue={editingUser.subscription_model} className="w-full border rounded-lg p-2.5 text-sm">
                                        <option value="basic">Basic</option>
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="parent">Parent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
                                    <select name="status" defaultValue={editingUser.is_subscribed ? 'active' : 'expired'} className="w-full border rounded-lg p-2.5 text-sm">
                                        <option value="active">Active</option>
                                        <option value="expired">Expired</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mt-3">
                                <label className="block text-xs font-bold text-gray-700 mb-1">Renewal Date</label>
                                <input 
                                    type="date" 
                                    name="renewal_date" 
                                    defaultValue={editingUser.renewal_date?.seconds ? new Date(editingUser.renewal_date.seconds * 1000).toISOString().split('T')[0] : ''} 
                                    className="w-full border rounded-lg p-2.5 text-sm" 
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-6">
                            <button type="button" onClick={handleDeleteUser} className="text-red-500 text-sm font-bold hover:underline">Delete User</button>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-300">Cancel</button>
                                <button type="submit" disabled={savingUser} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center gap-2">
                                    {savingUser && <div className="loader !w-3 !h-3 !border-2"></div>} Save Changes
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* --- USER LOGS MODAL --- */}
        {viewingUserLogs && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewingUserLogs(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b flex justify-between items-center">
                        <h3 className="font-bold text-lg">{viewingUserLogs.name} Activity Log</h3>
                        <button onClick={() => setViewingUserLogs(null)} className="text-2xl">&times;</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        {loadingLogs ? (
                            <div className="flex justify-center p-10"><div className="loader"></div></div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 sticky top-0"><tr><th className="px-6 py-3 text-left">Time</th><th className="px-6 py-3 text-left">Action</th><th className="px-6 py-3 text-left">Detail</th></tr></thead>
                                <tbody className="divide-y">
                                    {userLogs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="px-6 py-3 text-gray-500">{formatDate(log.timestamp)}</td>
                                            <td className="px-6 py-3"><span className="uppercase text-[10px] font-bold bg-gray-100 px-2 py-1 rounded">{log.type}</span></td>
                                            <td className="px-6 py-3">{log.detail}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Renewal Modal */}
        {showRenewalModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] backdrop-blur-sm">
                <div className="bg-white rounded-2xl w-full max-w-2xl p-8 relative">
                    <button onClick={() => setShowRenewalModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Renewal Management</h2>
                    <div className="max-h-64 overflow-y-auto border rounded-lg mb-6 mt-4">
                        {expiredUsers.length === 0 ? (
                            <p className="text-center py-8 text-gray-500">No expired users found.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 text-gray-700">
                                    <tr><th className="px-4 py-2 text-left">User</th><th className="px-4 py-2 text-left">Email</th></tr>
                                </thead>
                                <tbody>
                                    {expiredUsers.map(u => (
                                        <tr key={u.id} className="border-t border-gray-100"><td className="px-4 py-2 font-medium">{u.name}</td><td className="px-4 py-2 text-gray-600">{u.email}</td></tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setShowRenewalModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold">Cancel</button>
                        <button onClick={handleSendEmails} disabled={expiredUsers.length === 0 || sendingEmails} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 flex items-center gap-2">{sendingEmails ? 'Sending...' : 'Send Emails'}</button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default AdminPanel;

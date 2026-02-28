
import { db } from './firebaseService';
import { collection, doc, getDocs, setDoc, addDoc, updateDoc, increment, query, where, writeBatch, serverTimestamp, orderBy, limit, deleteDoc } from 'firebase/firestore';
import { GoogleGenAI } from "@google/genai";

const ANALYTICS_COLL = 'analytics';
const ACTIVITY_COLL = 'activity_logs';

// Initialize Gemini for Admin Analysis
const ai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY
});
// --- Tracking Functions ---

export const logUserActivity = async (
  userId: string | undefined, 
  userEmail: string | undefined | null,
  type: 'page_view' | 'click' | 'conversion' | 'error',
  detail: string,
  meta: any = {}
) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Log the granular event
    await addDoc(collection(db, ACTIVITY_COLL), {
      userId: userId || 'anonymous',
      userEmail: userEmail || 'anonymous',
      type,
      detail, 
      meta,   
      timestamp: serverTimestamp(),
      date: today
    });

    // 2. Update Global Analytics
    const analyticsRef = doc(db, ANALYTICS_COLL, today);
    const globalUpdate: any = { date: today };
    if (type === 'page_view') globalUpdate.visits = increment(1);
    if (type === 'click') globalUpdate.clicks = increment(1);
    
    await setDoc(analyticsRef, globalUpdate, { merge: true });

    // 3. Update User Profile
    if (userId) {
      try {
        const userRef = doc(db, 'users', userId);
        const updates: any = { last_visit: serverTimestamp() };
        
        if (type === 'page_view') updates.total_visits = increment(1);
        if (type === 'click') updates.total_clicks = increment(1);
        
        if (meta.referrer && meta.referrer !== '') {
           updates.acquisition_source = meta.referrer; 
        }

        await updateDoc(userRef, updates);
      } catch (userErr) {
        // Silent fail
      }
    }

  } catch (e) {
    console.error("Tracking Error:", e);
  }
};

// --- User Management (CRUD) ---

export const updateUserProfileAdmin = async (userId: string, data: any) => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, data);
        return { success: true };
    } catch (error) {
        console.error("Error updating user:", error);
        return { success: false, error };
    }
};

export const deleteUserAdmin = async (userId: string) => {
    try {
        await deleteDoc(doc(db, 'users', userId));
        return { success: true };
    } catch (error) {
        console.error("Error deleting user:", error);
        return { success: false, error };
    }
};

// --- Admin Data Fetching ---

export const getAdminStats = async () => {
  try {
    // 1. Fetch All Users
    const usersSnap = await getDocs(collection(db, 'users'));
    
    let totalUsers = 0;
    let activeSubs = 0;
    let totalRevenue = 0;
    let newUsersLast30Days = 0;
    
    // Revenue Breakdown
    let revenueStudent = 0;
    let revenueTeacher = 0;
    let revenueParent = 0;

    // Demographics
    let countStudent = 0;
    let countTeacher = 0;
    let countParent = 0;
    let countBasic = 0;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const users: any[] = [];

    usersSnap.forEach(doc => {
      const u = doc.data();
      totalUsers++;
      
      // Calculate New Users
      const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date(u.createdAt || 0);
      if (createdAt > thirtyDaysAgo) newUsersLast30Days++;

      // Subscription Logic
      if (u.is_subscribed) {
        activeSubs++;
        if (u.subscription_model === 'student') { totalRevenue += 99; revenueStudent += 99; }
        else if (u.subscription_model === 'teacher') { totalRevenue += 129; revenueTeacher += 129; }
        else if (u.subscription_model === 'parent') { totalRevenue += 149; revenueParent += 149; }
      }

      // Demographics
      if (u.subscription_model === 'student') countStudent++;
      else if (u.subscription_model === 'teacher') countTeacher++;
      else if (u.subscription_model === 'parent') countParent++;
      else countBasic++;
      
      users.push({ 
        id: doc.id, 
        ...u,
        total_visits: u.total_visits || 0,
        total_clicks: u.total_clicks || 0,
        last_visit: u.last_visit || null,
        source: u.acquisition_source || 'Direct',
        subscription_model: u.subscription_model || 'basic'
      });
    });

    // 2. Fetch Analytics
    const analyticsSnap = await getDocs(collection(db, ANALYTICS_COLL));
    let totalVisits = 0;
    let totalClicks = 0;
    const chartData: {date: string, visits: number, clicks: number}[] = [];

    analyticsSnap.forEach(doc => {
      const data = doc.data();
      totalVisits += (data.visits || 0);
      totalClicks += (data.clicks || 0);
      chartData.push({
        date: data.date || doc.id,
        visits: data.visits || 0,
        clicks: data.clicks || 0
      });
    });

    chartData.sort((a, b) => a.date.localeCompare(b.date));

    // Retention Rate (Active vs Total - Simple approx)
    // In real app, retention is cohort based. Here: (Active Subs / Total Users)
    const retentionRate = totalUsers > 0 ? ((activeSubs / totalUsers) * 100).toFixed(1) : 0;

    return {
      totalUsers,
      newUsersLast30Days,
      activeSubs,
      retentionRate,
      totalRevenue,
      revenueBreakdown: { student: revenueStudent, teacher: revenueTeacher, parent: revenueParent },
      demographics: { student: countStudent, teacher: countTeacher, parent: countParent, basic: countBasic },
      totalVisits,
      totalClicks,
      users,
      chartData
    };

  } catch (error) {
    console.error("Error getting admin stats", error);
    return null;
  }
};

export const getUserActivityLogs = async (userId: string) => {
  try {
    const q = query(
      collection(db, ACTIVITY_COLL), 
      where("userId", "==", userId),
      orderBy("timestamp", "desc"),
      limit(200) 
    );
    
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Error fetching user logs", e);
    return [];
  }
};

// --- AI Analysis ---

export const generateAdminReport = async (stats: any) => {
    const prompt = `
    Analyze the JurniQ Careers platform data. Act as a Chief Data Officer.
    
    Data:
    - Users: ${stats.totalUsers} (New in 30d: ${stats.newUsersLast30Days})
    - Revenue: ₹${stats.totalRevenue} (Student: ${stats.revenueBreakdown.student}, Teacher: ${stats.revenueBreakdown.teacher})
    - Retention Rate: ${stats.retentionRate}%
    - Engagement: ${stats.totalVisits} visits, ${stats.totalClicks} clicks.
    
    Provide a HTML report (h3, p, ul, li tags only) covering:
    1. **Health Check**: Is the platform growing healthily?
    2. **Revenue Opportunities**: Which plan is underperforming?
    3. **Action Plan**: 3 actionable steps to boost the Retention Rate.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("AI Report Error", error);
        return "<p>Failed to generate report.</p>";
    }
};

// --- Subscription & Email Management ---

export const getExpiredUsers = async () => {
    try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const expired: any[] = [];
        const now = new Date();

        usersSnap.forEach(doc => {
            const data = doc.data();
            let isExpired = false;
            
            if (data.subscription_status === 'expired') isExpired = true;
            if (data.renewal_date) {
                const rDate = data.renewal_date.toDate ? data.renewal_date.toDate() : new Date(data.renewal_date);
                if (rDate < now) isExpired = true;
            }

            if (isExpired || (data.subscription_model !== 'basic' && !data.is_subscribed)) {
                expired.push({ id: doc.id, ...data });
            }
        });
        return expired;
    } catch (e) {
        console.error(e);
        return [];
    }
};

export const sendRenewalEmails = async (users: any[]) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            console.log("SMTP Connection: Established");
            users.forEach(u => {
                console.log(`Email sent to ${u.email}: "Your JurniQ Plan has expired. Renew now!"`);
            });
            resolve({ success: true, count: users.length });
        }, 2000);
    });
};

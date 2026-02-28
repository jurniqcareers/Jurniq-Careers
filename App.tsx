
import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './components/Home';
import AboutUs from './components/AboutUs';
import CareerForm from './components/CareerForm';
import CareerPath from './components/CareerPath';
import Dashboard from './components/Dashboard';
import Sessions from './components/Sessions';
import ContactUs from './components/ContactUs';
import Quiz from './components/Quiz';
import Notes from './components/Notes';
import Sports from './components/Sports';
import Business from './components/Business';
import Videos from './components/Videos';
import ChildAbility from './components/ChildAbility';
import FeeStructure from './components/FeeStructure';
import Reminder from './components/Reminder';
import TeachAbility from './components/TeachAbility';
import TeacherNotes from './components/TeacherNotes';
import Subscription from './components/Subscription';
import AuthModals from './components/AuthModals';
import AdminPanel from './components/AdminPanel';
import StudentTestLogin from './components/StudentTestLogin';
import Blogs from './components/Blogs';
import { User } from './types';
import { auth, db } from './services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';
import { logUserActivity } from './services/adminService';
import { initAnalytics, analytics, identifyUser, resetAnalytics } from './services/analyticsService';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authModalView, setAuthModalView] = useState<'login' | 'register' | 'forgot' | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Ref to hold user for event listeners to access current state
  const userRef = useRef<User | null>(null);

  // Initialize Analytics on Mount
  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    let firestoreUnsubscribe: (() => void) | null = null;

    // Auth Listener
    const authUnsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        // 1. Set basic auth user first for immediate UI feedback
        const basicUser: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          photoURL: firebaseUser.photoURL
        };
        
        setUser(basicUser);
        userRef.current = basicUser;

        // 2. Subscribe to Firestore User Document to get 'name' and 'profile_pic'
        const userDocRef = doc(db, "users", firebaseUser.uid);
        firestoreUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const userData = docSnap.data();
                const fullUser: User = {
                    ...basicUser,
                    name: userData.name,
                    profile_pic: userData.profile_pic
                };
                setUser(fullUser);
                userRef.current = fullUser;
            }
        });
        
        // Internal Admin Log
        logUserActivity(firebaseUser.uid, firebaseUser.email, 'conversion', 'User Login');

        // Analytics Identify
        identifyUser(firebaseUser.uid, {
          email: firebaseUser.email,
          name: firebaseUser.displayName
        });

      } else {
        if (firestoreUnsubscribe) {
            firestoreUnsubscribe();
            firestoreUnsubscribe = null;
        }
        
        setUser(null);
        userRef.current = null;
        
        // Reset Analytics Session
        resetAnalytics();

        // Redirect if protected route
        const protectedRoutes = ['/dashboard', '/notes', '/sports', '/business', '/videos', '/child-ability', '/fee-structure', '/reminder', '/teach-ability', '/teacher-notes'];
        if (protectedRoutes.includes(location.pathname)) {
            navigate('/');
        }
      }
    });

    return () => {
        authUnsubscribe();
        if (firestoreUnsubscribe) firestoreUnsubscribe();
    };
  }, [navigate]);

  // Track Page Views (Both Internal & External Analytics)
  useEffect(() => {
      const pageName = location.pathname === '/' ? 'Home' : location.pathname.substring(1);
      
      // 1. Internal Firestore Log
      logUserActivity(
          userRef.current?.uid, 
          userRef.current?.email, 
          'page_view', 
          `Viewed ${pageName}`
      );

      // 2. PostHog Page View
      if (analytics) {
        analytics.capture('$pageview');
      }
  }, [location]);

  // Global Click Tracker (Intelligent)
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        
        // Attempt to find a meaningful clickable element (button, link, or element with role/class)
        const clickable = target.closest('button, a, [role="button"], input[type="submit"], .cursor-pointer') as HTMLElement | null;
        
        if (clickable) {
            let label = clickable.innerText || clickable.getAttribute('aria-label') || clickable.getAttribute('title') || 'Unknown Element';
            // Truncate if too long
            if (label.length > 50) label = label.substring(0, 50) + '...';
            
            // Clean up label
            label = label.replace(/\n/g, ' ').trim();

            if (label) {
                logUserActivity(
                    userRef.current?.uid,
                    userRef.current?.email,
                    'click',
                    `Clicked "${label}"`
                );
            }
        }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  // Helper for internal navigation
  const handleInternalNavigate = (view: any) => {
      if (view === 'home') navigate('/');
      else if (view === 'app') navigate('/career-form');
      else navigate(`/${view}`);
  };

  const handleRequireAuth = () => {
      setAuthModalView('login');
  };

  const getCurrentViewName = () => {
      const path = location.pathname;
      if (path === '/') return 'home';
      if (path === '/career-form') return 'app';
      return path.substring(1);
  };

  const isFullScreen = ['/dashboard', '/quiz', '/sports', '/business', '/videos', '/child-ability', '/fee-structure', '/reminder', '/teach-ability', '/teacher-notes', '/admin', '/student-test'].includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen font-sans">
      {!isFullScreen && (
        <Header 
          user={user} 
          onLoginClick={() => setAuthModalView('login')} 
          onChangeView={handleInternalNavigate}
          currentView={getCurrentViewName() as any}
        />
      )}

      <Routes>
        <Route path="/" element={<Home user={user} onGetStarted={() => navigate('/career-form')} onViewSubscription={() => navigate('/subscription')} />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/career-form" element={<CareerForm user={user} onRequireAuth={handleRequireAuth} />} />
        <Route path="/career-path" element={<CareerPath user={user} onRequireAuth={handleRequireAuth} />} />
        <Route path="/dashboard" element={<Dashboard user={user} onNavigate={handleInternalNavigate} />} />
        <Route path="/sessions" element={<Sessions user={user} onRequireAuth={handleRequireAuth} />} />
        <Route path="/blogs" element={<Blogs user={user} />} />
        <Route path="/contact" element={<ContactUs />} />
        <Route path="/quiz" element={<Quiz user={user} onRequireAuth={handleRequireAuth} onExit={() => navigate('/dashboard')} />} />
        <Route path="/test" element={<Quiz user={user} onRequireAuth={handleRequireAuth} onExit={() => navigate('/')} />} />
        <Route path="/student-test" element={<StudentTestLogin />} />
        <Route path="/notes" element={<Notes user={user} onRequireAuth={handleRequireAuth} />} />
        <Route path="/sports" element={<Sports user={user} onRequireAuth={handleRequireAuth} onBack={() => navigate('/dashboard')} />} />
        <Route path="/business" element={<Business user={user} onRequireAuth={handleRequireAuth} onBack={() => navigate('/dashboard')} />} />
        <Route path="/videos" element={<Videos user={user} onRequireAuth={handleRequireAuth} onBack={() => navigate('/dashboard')} />} />
        <Route path="/child-ability" element={<ChildAbility user={user} onRequireAuth={handleRequireAuth} onBack={() => navigate('/dashboard')} />} />
        <Route path="/fee-structure" element={<FeeStructure onBack={() => navigate('/dashboard')} />} />
        <Route path="/reminder" element={<Reminder onBack={() => navigate('/dashboard')} />} />
        <Route path="/teach-ability" element={<TeachAbility user={user} onRequireAuth={handleRequireAuth} onBack={() => navigate('/dashboard')} />} />
        <Route path="/teacher-notes" element={<TeacherNotes user={user} onRequireAuth={handleRequireAuth} onBack={() => navigate('/dashboard')} />} />
        <Route path="/subscription" element={<Subscription user={user} onRequireAuth={handleRequireAuth} />} />
        
        {/* Admin Route */}
        <Route path="/admin" element={<AdminPanel user={user} onNavigate={handleInternalNavigate} />} />
        
        {/* Redirect unknown routes */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {!isFullScreen && <Footer />}

      <AuthModals 
        view={authModalView} 
        onClose={() => setAuthModalView(null)} 
        onSwitch={setAuthModalView} 
      />
    </div>
  );
}

export default App;

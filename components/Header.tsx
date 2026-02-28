
import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { auth, db } from '../services/firebaseService';
import { doc, onSnapshot } from 'firebase/firestore';

interface HeaderProps {
  user: User | null;
  onLoginClick: () => void;
  onChangeView: (view: 'home' | 'app' | 'about' | 'dashboard' | 'sessions' | 'contact' | 'admin' | 'student-test' | 'blogs') => void;
  currentView: 'home' | 'app' | 'about' | 'dashboard' | 'sessions' | 'contact' | 'admin' | 'student-test' | 'blogs';
}

const ADMIN_EMAILS = ['jurniqcareers@gmail.com', 'chairman@balitandsons.com'];

const Header: React.FC<HeaderProps> = ({ user, onLoginClick, onChangeView, currentView }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [fetchedProfilePic, setFetchedProfilePic] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.profile_pic) {
            setFetchedProfilePic(data.profile_pic);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      onChangeView('home');
      setIsProfileDropdownOpen(false);
    } catch (error) {
      console.error("Logout error", error);
    }
  };

  const getLinkClass = (view: string) => {
    return `text-base font-medium transition-colors ${currentView === view ? 'text-primary-blue font-semibold' : 'text-gray-600 hover:text-primary-blue'}`;
  };

  const isAdmin = user && user.email && ADMIN_EMAILS.includes(user.email);

  // Prioritize fetched profile_pic, then prop profile_pic, then photoURL, then placeholder
  const profileImage = fetchedProfilePic || user?.profile_pic || user?.photoURL || "https://placehold.co/40x40/3BB0FF/FFFFFF?text=J";
  
  // Prioritize name from DB, then displayName from Auth, then Email part
  const displayName = user?.name || user?.displayName || user?.email?.split('@')[0] || "User";

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-6 py-2 flex justify-between items-center">
        <div className="flex items-center cursor-pointer" onClick={() => onChangeView('home')}>
          <img 
            src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2Flogo_blue_1500px.png?alt=media&token=6cbec2e5-a212-402a-a685-30ea15836845" 
            onError={(e) => { e.currentTarget.src = 'https://placehold.co/180x45/3BB0FF/FFFFFF?text=Jurniq+Careers'; }}
            alt="Jurniq Careers" 
            style={{ height: '45px', maxWidth: '180px' }} 
          />
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center space-x-8">
          <button onClick={() => onChangeView('home')} className={getLinkClass('home')}>Home</button>
          <button onClick={() => onChangeView('blogs')} className={getLinkClass('blogs')}>Blogs</button>
          {user && (
            <button onClick={() => onChangeView('dashboard')} className={getLinkClass('dashboard')}>
              Dashboard
            </button>
          )}
          <button onClick={() => onChangeView('contact')} className={getLinkClass('contact')}>Contact us</button>
          <button onClick={() => onChangeView('sessions')} className={getLinkClass('sessions')}>Sessions</button>
          <button onClick={() => onChangeView('about')} className={getLinkClass('about')}>About Us</button>
          
          {/* Admin Link */}
          {isAdmin && (
             <button onClick={() => onChangeView('admin')} className={`px-3 py-1 rounded bg-gray-800 text-white text-sm font-bold hover:bg-black transition`}>
               Admin Panel
             </button>
          )}
        </nav>

        {/* Auth / Profile */}
        <div id="auth-container">
          {user ? (
            <div className="relative">
              <button 
                onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                className="flex items-center gap-3 cursor-pointer focus:outline-none"
              >
                <img 
                  src={profileImage} 
                  alt="User" 
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary-blue" 
                />
                <span className="font-semibold text-gray-700 hidden sm:block">
                  {displayName}
                </span>
              </button>
              {isProfileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 ring-1 ring-black ring-opacity-5">
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button 
              onClick={onLoginClick}
              className="bg-primary-blue text-white px-4 py-1 rounded-lg font-semibold text-sm hover:bg-primary-dark transition-colors shadow-md hover:shadow-lg h-[29px] flex items-center justify-center min-w-[120px]"
            >
              Login/Register
            </button>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-600"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg absolute top-[61px] left-0 w-full z-40 border-t">
          <button onClick={() => { onChangeView('home'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-6 py-3 ${currentView === 'home' ? 'text-primary-blue font-semibold' : 'text-gray-600'} hover:bg-gray-50 text-base`}>Home</button>
          <button onClick={() => { onChangeView('blogs'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-6 py-3 ${currentView === 'blogs' ? 'text-primary-blue font-semibold' : 'text-gray-600'} hover:bg-gray-50 text-base`}>Blogs</button>
          {user && (
             <button onClick={() => { onChangeView('dashboard'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-6 py-3 ${currentView === 'dashboard' ? 'text-primary-blue font-semibold' : 'text-gray-600'} hover:bg-gray-50 text-base`}>Dashboard</button>
          )}
          <button onClick={() => { onChangeView('contact'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-6 py-3 ${currentView === 'contact' ? 'text-primary-blue font-semibold' : 'text-gray-600'} hover:bg-gray-50 text-base`}>Contact us</button>
          <button onClick={() => { onChangeView('sessions'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-6 py-3 ${currentView === 'sessions' ? 'text-primary-blue font-semibold' : 'text-gray-600'} hover:bg-gray-50 text-base`}>Sessions</button>
          <button onClick={() => { onChangeView('about'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-6 py-3 ${currentView === 'about' ? 'text-primary-blue font-semibold' : 'text-gray-600'} hover:bg-gray-50 text-base`}>About Us</button>
          
          {isAdmin && (
             <button onClick={() => { onChangeView('admin'); setIsMobileMenuOpen(false); }} className={`block w-full text-left px-6 py-3 text-white bg-gray-800 hover:bg-gray-900 text-base`}>Admin Panel</button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;

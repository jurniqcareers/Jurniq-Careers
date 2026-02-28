
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { auth, db, storage } from '../services/firebaseService';
import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { API } from '@/services/apiConfig';

// Types for Cashfree and Cropper attached to window
declare global {
  interface Window {
    Cashfree: any;
    Cropper: any;
  }
}

interface DashboardProps {
  user: User | null;
  onNavigate: (view: 'home' | 'app' | 'career-path' | 'about' | 'dashboard' | 'quiz' | 'notes' | 'sports' | 'business' | 'videos' | 'child-ability' | 'fee-structure' | 'reminder' | 'teach-ability' | 'teacher-notes') => void;
}

interface UserProfile extends User {
  phone?: string;
  is_subscribed?: boolean;
  subscription_model?: 'basic' | 'student' | 'teacher' | 'parent';
  profile_pic?: string;
  name?: string;
  saved_academies?: {id: string, name: string, sport: string, address: string}[];
  saved_business_ideas?: {id: string, type: 'analysis' | 'deep-dive', title: string, description: string, data: any}[];
}

const Dashboard: React.FC<DashboardProps> = ({ user: authUser, onNavigate }) => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 1024);
  const [activeSection, setActiveSection] = useState('student-section');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Modals state
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState<{status: 'success' | 'failure', message: string} | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  
  // Payment & Profile state
  const [selectedPlan, setSelectedPlan] = useState<{plan: string, amount: string} | null>(null);
  const [paymentLoader, setPaymentLoader] = useState(false);
  const [paymentLoaderText, setPaymentLoaderText] = useState('');
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const cropperRef = useRef<any>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Refs for inputs
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null); 

  // Cashfree instance
  const cashfreeRef = useRef<any>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize Cashfree
    if (window.Cashfree) {
      try {
        cashfreeRef.current = new window.Cashfree({ mode: "production" });
      } catch (e) {
        console.error("Cashfree SDK failed to initialize", e);
      }
    }

    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light';
    setTheme(storedTheme);
  }, []);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
              setShowSettingsDropdown(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch user data
  useEffect(() => {
    if (!authUser) {
      setLoading(false);
      return;
    }

    const userRef = doc(db, "users", authUser.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData({
          ...authUser,
          ...data,
          profile_pic: data.profile_pic || authUser.photoURL || 'https://jurniqcareers.com/wp-content/uploads/2025/07/user.png'
        });
        
        // Check for payment verification
        if (sessionStorage.getItem('payment_initiated') === 'true' && data.is_subscribed) {
          sessionStorage.removeItem('payment_initiated');
          setPaymentLoader(false);
          setShowConfirmationModal({ status: 'success', message: 'Your subscription is now active!' });
        }
      } else {
         const newUser = {
            name: authUser.displayName || 'Jurniq User',
            email: authUser.email,
            phone: '',
            profile_pic: authUser.photoURL || 'https://jurniqcareers.com/wp-content/uploads/2025/07/user.png',
            is_subscribed: false,
            subscription_model: 'basic' as const
         };
         setDoc(userRef, newUser);
         setUserData({ ...authUser, ...newUser });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser]);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleLogout = async () => {
    await auth.signOut();
    onNavigate('home');
  };

  // --- ACCESS CONTROL LOGIC ---
  const checkAccess = (section: string): boolean => {
      if (!userData) return false;
      const model = userData.subscription_model || 'basic';
      
      // Basic free features: Career Path & Sports
      // Added 'career-path-card' explicitly to ensure it unlocks
      if (['career-path', 'career-path-card', 'sport-card'].includes(section)) return true;

      // Student Section Logic (Paid Features)
      if (['notes-card', 'business-card', 'videos-card', 'quiz-card'].includes(section)) {
          // Unlocked for Student, Teacher, Parent
          return ['student', 'teacher', 'parent'].includes(model);
      }

      // Parent Section Logic
      if (['child-ability', 'fee-structure', 'reminder'].includes(section)) {
          // Unlocked only for Parent
          return model === 'parent';
      }

      // Teacher Section Logic
      if (['teach-ability', 'teacher-notes'].includes(section)) {
          // Unlocked only for Teacher
          return model === 'teacher';
      }

      return false;
  };

  const isLocked = (cardId: string) => {
      // Specific logic for Basic plan visual locks in Student Section
      if (userData?.subscription_model === 'basic' || !userData?.is_subscribed) {
          // Locked items for basic users: Notes, Business, Videos, Quiz
          if (['business-card', 'videos-card', 'notes-card', 'quiz-card'].includes(cardId)) return true;
      }
      return !checkAccess(cardId);
  };

  const handleCardClick = (card: any) => {
      if (card.isInternal) {
          if (!checkAccess(card.id || card.link)) {
              // Trigger upgrade flow if locked
              setShowSubscriptionModal(true);
          } else {
              onNavigate(card.link as any);
          }
      } else {
          window.open(card.link, '_blank');
      }
  };

  // Navigation Logic for Sections
  const canAccessSection = (sec: string) => {
      const model = userData?.subscription_model || 'basic';
      if (sec === 'student-section') return true; // Visible to everyone
      if (sec === 'parents-section') return model === 'parent';
      if (sec === 'teacher-section') return model === 'teacher';
      return false;
  };

  const handleAcademyClick = (academyId: string) => {
      localStorage.setItem('jurniq_target_academy_id', academyId);
      onNavigate('sports');
      setShowSettingsDropdown(false);
  };

  const handleBusinessIdeaClick = (idea: any) => {
      localStorage.setItem('jurniq_target_business_idea', JSON.stringify(idea));
      onNavigate('business');
      setShowSettingsDropdown(false);
  };

  const initiatePayment = async (customerDetails: {name: string, email: string, phone: string}) => {
    if (!selectedPlan || !userData) return;
    
    setPaymentLoader(true);
    setPaymentLoaderText('Processing Payment...');
    setShowPaymentModal(false);
    sessionStorage.setItem('payment_initiated', 'true');

    try {
        const idToken = await auth.currentUser?.getIdToken(true);
        const response = await fetch(API.createOrder, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
            body: JSON.stringify({
                planName: selectedPlan.plan, // 'Student', 'Teacher', 'Parent'
                amount: parseFloat(selectedPlan.amount),
                customerId: authUser?.uid,
                customerEmail: customerDetails.email,
                customerPhone: customerDetails.phone
            })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to get payment session.');
        
        if (cashfreeRef.current) {
            cashfreeRef.current.checkout({ 
                paymentSessionId: result.payment_session_id,
                returnUrl: `${window.location.origin}/dashboard?order_id={order_id}`
            });
        } else {
            throw new Error("Cashfree SDK not available");
        }
    } catch (error: any) {
        console.error("Payment Error", error);
        setShowConfirmationModal({ status: 'failure', message: "Could not start payment: " + error.message });
        sessionStorage.removeItem('payment_initiated');
        setPaymentLoader(false);
    }
  };

  const handleProfileSave = async () => {
      if (!authUser || !userData) return;
      setProfileSaving(true);
      
      try {
          const updates: any = {
              name: nameInputRef.current?.value,
              phone: phoneInputRef.current?.value
          };
          await updateDoc(doc(db, "users", authUser.uid), updates);
          setShowProfileModal(false);
      } catch (error) {
          console.error("Profile update error", error);
          alert("Failed to update profile");
      } finally {
          setProfileSaving(false);
      }
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (evt) => {
              setImageToCrop(evt.target?.result as string);
              setShowCropModal(true);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  useEffect(() => {
      if (showCropModal && imageElementRef.current && window.Cropper) {
          if (cropperRef.current) cropperRef.current.destroy();
          cropperRef.current = new window.Cropper(imageElementRef.current, {
              aspectRatio: 1,
              viewMode: 1,
              background: false,
              autoCropArea: 0.9
          });
      }
      return () => {
          if (cropperRef.current) cropperRef.current.destroy();
      };
  }, [showCropModal, imageToCrop]);

  const handleCropSave = () => {
      if (!cropperRef.current || !authUser) return;
      
      cropperRef.current.getCroppedCanvas({ width: 500, height: 500 }).toBlob(async (blob: Blob) => {
          if (!blob) return;
          try {
              const storageRef = ref(storage, `profile_images/${authUser.uid}`);
              await uploadBytes(storageRef, blob);
              const url = await getDownloadURL(storageRef);
              await updateDoc(doc(db, "users", authUser.uid), { profile_pic: url });
              setShowCropModal(false);
          } catch (error) {
              console.error("Image upload failed", error);
              alert("Failed to upload image");
          }
      }, 'image/jpeg', 0.9);
  };

  const dashboardStyles = `
    .dashboard-container {
        --bg-primary: ${theme === 'dark' ? '#1a202c' : '#ffffff'};
        --bg-secondary: ${theme === 'dark' ? '#2d3748' : '#f7fafc'};
        --text-primary: ${theme === 'dark' ? '#e2e8f0' : '#2d3748'};
        --text-secondary: ${theme === 'dark' ? '#a0aec0' : '#718096'};
        --border-color: ${theme === 'dark' ? '#4a5568' : '#e2e8f0'};
        --card-bg: ${theme === 'dark' ? '#2d3748' : '#ffffff'};
    }
    .card {
        background-color: transparent;
        border: none;
        position: relative;
        overflow: hidden;
        border-radius: 0.75rem;
    }
    .sidebar { transition: width 0.3s, transform 0.3s; }
    .sidebar.collapsed .sidebar-text { display: none; }
    .nav-link.active { background-color: var(--bg-primary); }
    .card.locked { cursor: not-allowed; }
    .card.locked .card-overlay {
        background: rgba(0,0,0,0.7);
        display: flex;
    }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .cards-container {
        width: 100%;
        margin: 0 auto;
        /* Mobile: max 3 rows, 2 cols, gap 1rem */
        max-width: calc(((80vh - 2rem) / 3) * 0.75 * 2 + 1rem);
    }
    @media (min-width: 768px) {
        .cards-container {
            /* Desktop: max 2 rows, 3 cols, gap 1.5rem */
            max-width: calc(((80vh - 1.5rem) / 2) * 0.75 * 3 + 3rem);
        }
    }
  `;

  if (loading) return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center">
         <div className="loader !w-12 !h-12 !border-4 border-blue-500"></div>
      </div>
  );

  return (
    <div className={`dashboard-container min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans`}>
      <style>{dashboardStyles}</style>

      {paymentLoader && (
          <div className="fixed inset-0 z-[101] bg-black/70 flex flex-col items-center justify-center text-white">
              <div className="loader w-12 h-12 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p>{paymentLoaderText}</p>
          </div>
      )}

      <div className="dashboard-content flex h-screen overflow-hidden relative">
          {/* Mobile Sidebar Overlay */}
          {!sidebarCollapsed && (
              <div 
                  className="md:hidden fixed inset-0 bg-black/50 z-30"
                  onClick={() => setSidebarCollapsed(true)}
              />
          )}

          {/* Sidebar */}
          <aside className={`sidebar h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col absolute md:relative z-40 ${sidebarCollapsed ? '-translate-x-full md:translate-x-0 md:w-20' : 'translate-x-0 w-64'}`}>
              <div className="p-4 h-20 flex items-center justify-center shrink-0">
                  <img src={sidebarCollapsed ? "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2Fshort_logo_blue.png?alt=media&token=6e0d417e-7531-416d-87ca-245208a86e3d" : "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2Flogo_blue_1500px.png?alt=media&token=6cbec2e5-a212-402a-a685-30ea15836845"} alt="Logo" className="max-h-full max-w-full object-contain transition-all" />
              </div>
              
              <nav className="flex-1 flex flex-col justify-center space-y-2 px-3 overflow-y-auto">
                  {[
                      { id: 'student-section', icon: 'fa-user-graduate', label: 'Student Section' },
                      { id: 'parents-section', icon: 'fa-users', label: 'Parents Section', locked: !canAccessSection('parents-section') }, 
                      { id: 'teacher-section', icon: 'fa-chalkboard-teacher', label: 'Teacher Section', locked: !canAccessSection('teacher-section') }
                  ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                            if (!item.locked) {
                                setActiveSection(item.id);
                                if (window.innerWidth < 768) setSidebarCollapsed(true);
                            }
                        }}
                        className={`w-full flex items-center p-3 rounded-lg transition-colors ${activeSection === item.id ? 'bg-[var(--bg-primary)] text-blue-500' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'} ${item.locked ? 'opacity-50 cursor-not-allowed' : ''} ${sidebarCollapsed ? 'md:justify-center' : ''}`}
                      >
                          <i className={`fas ${item.icon} w-6 text-center text-xl`}></i>
                          <span className={`sidebar-text ml-3 font-medium whitespace-nowrap ${sidebarCollapsed ? 'md:hidden block' : 'block'}`}>{item.label}</span>
                          {item.locked && (!sidebarCollapsed || window.innerWidth < 768) && <i className="fas fa-lock ml-auto text-xs"></i>}
                      </button>
                  ))}
              </nav>

              <div className={`p-4 flex justify-around shrink-0 ${sidebarCollapsed ? 'md:flex-col md:gap-4 md:items-center' : ''}`}>
                 {/* Facebook */}
                 <a href="https://www.facebook.com/profile.php?id=61580102213164" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-blue-600"><i className="fab fa-facebook text-xl"></i></a>
                 {/* X (Twitter) */}
                 <a href="https://x.com/jurniqcareers" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-black"><i className="fa-brands fa-x-twitter text-xl"></i></a>
                 {/* LinkedIn */}
                 <a href="https://www.linkedin.com/company/jurniq-careers/" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-blue-700"><i className="fab fa-linkedin-in text-xl"></i></a>
                 {/* Instagram */}
                 <a href="https://www.instagram.com/jurniqcareers/" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-pink-600"><i className="fab fa-instagram text-xl"></i></a>
                 {/* YouTube */}
                 <a href="https://www.youtube.com/@JurniqCareers" target="_blank" rel="noopener noreferrer" className="text-[var(--text-secondary)] hover:text-red-600"><i className="fab fa-youtube text-xl"></i></a>
              </div>
          </aside>

          {/* Main Area */}
          <main className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)] h-full overflow-hidden">
              {/* Header */}
              <header className="flex items-center justify-between p-4 md:p-6 border-b border-[var(--border-color)] shrink-0">
                  <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-[var(--text-primary)] focus:outline-none p-2 -ml-2"><i className="fas fa-bars text-xl"></i></button>
                  <div className="flex items-center gap-2 md:gap-4">
                      {userData?.subscription_model === 'basic' && (
                        <button onClick={() => setShowSubscriptionModal(true)} className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg font-semibold hover:shadow-lg transition text-xs md:text-sm whitespace-nowrap">
                            <i className="fas fa-crown mr-1 md:mr-2 text-yellow-300"></i> <span className="hidden sm:inline">Upgrade Plan</span><span className="sm:hidden">Upgrade</span>
                        </button>
                      )}
                      
                      <div className="relative" ref={settingsDropdownRef}>
                          <button onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition ${showSettingsDropdown ? 'bg-[var(--bg-secondary)] text-blue-500' : 'text-[var(--text-primary)] hover:text-blue-500'}`}>
                              <i className="fas fa-cog text-lg"></i>
                          </button>
                          {showSettingsDropdown && (
                              <div className="absolute right-0 mt-2 w-64 md:w-72 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in-up">
                                  <div className="p-4 border-b border-[var(--border-color)]"><h4 className="font-bold text-[var(--text-primary)]">Settings</h4></div>
                                  <div className="p-2 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
                                      <button onClick={toggleTheme} className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[var(--bg-secondary)] transition text-[var(--text-primary)] text-sm font-medium">
                                          <span><i className="fas fa-adjust mr-2 text-[var(--text-secondary)]"></i> Theme</span>
                                          <span className="text-[10px] bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded capitalize">{theme}</span>
                                      </button>
                                  </div>
                              </div>
                          )}
                      </div>

                      <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 md:gap-3 focus:outline-none">
                          <img src={userData?.profile_pic} alt="Profile" className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-[var(--border-color)] object-cover" />
                          <span className="hidden md:block font-semibold text-[var(--text-primary)]">{userData?.name}</span>
                      </button>
                  </div>
              </header>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col justify-center no-scrollbar">
                  <div className="cards-container">
                    {activeSection === 'student-section' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 pb-8">
                            {[
                                { title: 'Career Path', img: 'https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fcareer%20path.jpg?alt=media&token=ad0191a1-7676-41a3-91af-4daf0e3868ad', link: 'career-path', isInternal: true, id: 'career-path-card' }, 
                                { title: 'Quiz', img: 'https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fquiz.jpg?alt=media&token=d04475cb-18e2-44bc-b280-c6d894817865', link: 'quiz', isInternal: true, id: 'quiz-card' },
                                { title: 'Notes', img: 'https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fpersonal%20notes.jpg?alt=media&token=759dab71-6e90-4163-9ce1-24dd20f12b5f', link: 'notes', isInternal: true, id: 'notes-card' },
                                { title: 'Sports', img: 'https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fsport.png?alt=media&token=48471385-f913-45ed-b5e9-226bef05e495', link: 'sports', isInternal: true, id: 'sport-card' },
                                { title: 'Business', img: 'https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fbusiness.jpg?alt=media&token=bb0fbb07-8ab2-4469-b97a-77096b7a3e5f', link: 'business', isInternal: true, id: 'business-card' },
                                { title: 'Videos', img: 'https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fvideos.jpg?alt=media&token=782ceaa5-98dc-4159-8070-ed1e88aaa4d3', link: 'videos', isInternal: true, id: 'videos-card' }
                            ].map((card, idx) => {
                                const locked = isLocked(card.id || '');
                                return (
                                    <div key={idx} onClick={() => handleCardClick(card)} className={`card group transition-transform hover:-translate-y-1 shadow-md hover:shadow-xl rounded-xl ${locked ? 'locked' : 'cursor-pointer'}`}>
                                        <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl">
                                            <img src={card.img} alt={card.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                            <div className="card-overlay absolute inset-0 hidden items-center justify-center flex-col text-white">
                                                <i className="fas fa-lock text-3xl mb-2"></i>
                                                <span className="text-sm font-bold uppercase tracking-wider">Locked</span>
                                            </div>
                                            {!locked && (
                                                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 flex justify-between items-center">
                                                    <h3 className="font-bold text-white text-xs truncate mr-1">{card.title}</h3>
                                                    <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full font-semibold hover:bg-blue-500 transition-colors shadow-lg whitespace-nowrap">Open</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    
                    {activeSection === 'parents-section' && (
                         <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 pb-8">
                            {[
                                { title: "Your child's ability", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fchild%20ability.jpg?alt=media&token=fa9d2fd6-2297-42d7-a5d3-1b96fd9e11e9", link: "child-ability", isInternal: true, id: 'child-ability' },
                                { title: "Fee Structure", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Ffees.jpg?alt=media&token=78b6bb5d-604b-4469-bba4-3a4f54e609d2", link: "fee-structure", isInternal: true, id: 'fee-structure' },
                                { title: "Reminder", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Freminder.jpg?alt=media&token=0dc35aac-c98c-4b01-9a78-68c9a1aebe7e", link: "reminder", isInternal: true, id: 'reminder' }
                            ].map((card, idx) => (
                                <div key={idx} onClick={() => handleCardClick(card)} className="card group cursor-pointer transition-transform hover:-translate-y-1 shadow-md hover:shadow-xl rounded-xl">
                                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl">
                                        <img src={card.img} alt={card.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 flex justify-between items-center">
                                            <h3 className="font-bold text-white text-xs truncate mr-1">{card.title}</h3>
                                            <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full font-semibold hover:bg-blue-500 transition-colors shadow-lg whitespace-nowrap">Open</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                         </div>
                    )}

                    {activeSection === 'teacher-section' && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 pb-8">
                             {[
                                { title: "Teach as Student's Ability", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fteach%20as%20student.jpg?alt=media&token=c6b549ed-ce6c-4e32-b90f-535405e59952", link: "teach-ability", isInternal: true, id: 'teach-ability' },
                                { title: "My Personal Notes", img: "https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fpersonal%20notes.jpg?alt=media&token=759dab71-6e90-4163-9ce1-24dd20f12b5f", link: "teacher-notes", isInternal: true, id: 'teacher-notes' }
                            ].map((card, idx) => (
                                <div key={idx} onClick={() => handleCardClick(card)} className="card group cursor-pointer transition-transform hover:-translate-y-1 shadow-md hover:shadow-xl rounded-xl">
                                    <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl">
                                        <img src={card.img} alt={card.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700 flex justify-between items-center">
                                            <h3 className="font-bold text-white text-xs truncate mr-1">{card.title}</h3>
                                            <span className="bg-blue-600 text-white text-[10px] px-2 py-1 rounded-full font-semibold hover:bg-blue-500 transition-colors shadow-lg whitespace-nowrap">Open</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                  </div>
              </div>
          </main>
      </div>

      {/* Subscription Modal */}
      {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-6xl p-8 relative animate-fade-in-up max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setShowSubscriptionModal(false)} className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-red-500 text-2xl">&times;</button>
                  <h2 className="text-3xl font-bold text-center mb-2">Upgrade Your Plan</h2>
                  <p className="text-center text-[var(--text-secondary)] mb-8">Select a plan to unlock specific sections of the dashboard.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                     {[
                         { name: 'Basic', price: 'FREE', desc: 'Starter Access', features: ['Career Path', 'Sports Finder'], btn: 'Current', btnClass: 'bg-gray-500 cursor-default' },
                         { name: 'Student', price: '₹99', period: '/mo', desc: 'Unlock Student Tools', features: ['Career Path + Sports', 'Quiz Test', 'Notes & Videos', 'Business Ideas'], btn: 'Choose Plan', id: 'student', amount: '99' },
                         { name: 'Teacher', price: '₹129', period: '/mo', desc: 'For Educators', features: ['All Student Features', 'Student Analysis Tools', 'Notes Upload System'], btn: 'Choose Plan', id: 'teacher', amount: '129' },
                         { name: 'Parent', price: '₹149', period: '/mo', desc: 'Complete Family Pack', features: ['All Student Features', 'Child Ability Test', 'Fee Structures'], btn: 'Choose Plan', id: 'parent', amount: '149', popular: true }
                     ].map((plan, idx) => (
                         <div key={idx} className={`border ${plan.popular ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-[var(--border-color)]'} rounded-xl p-6 flex flex-col relative bg-[var(--card-bg)] transform transition hover:-translate-y-1`}>
                             {plan.popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow">BEST VALUE</div>}
                             <h3 className="text-xl font-bold">{plan.name}</h3>
                             <p className="text-sm text-[var(--text-secondary)] mb-4">{plan.desc}</p>
                             <div className="my-4"><span className="text-4xl font-bold text-blue-600 dark:text-blue-400">{plan.price}</span><span className="text-[var(--text-secondary)]">{plan.period}</span></div>
                             {plan.id ? (
                                 <button onClick={() => { setSelectedPlan({ plan: plan.id!, amount: plan.amount! }); setShowSubscriptionModal(false); setShowPaymentModal(true); }} className="mt-auto bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-md">{plan.btn}</button>
                             ) : (
                                 <button className="mt-auto bg-gray-400 text-white py-3 rounded-lg font-semibold cursor-default">{plan.btn}</button>
                             )}
                             <ul className="mt-6 space-y-2 text-sm text-[var(--text-secondary)]">
                                 {plan.features.map((f, i) => (
                                     <li key={i} className="flex items-start"><i className={`fas fa-check text-green-500 mr-2 mt-1`}></i>{f}</li>
                                 ))}
                             </ul>
                         </div>
                     ))}
                  </div>
              </div>
          </div>
      )}

      {/* Payment Details Modal */}
      {showPaymentModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl w-full max-w-md p-8 relative animate-zoom-in">
                  <button onClick={() => setShowPaymentModal(false)} className="absolute top-4 right-4 text-[var(--text-secondary)] text-2xl hover:text-red-500">&times;</button>
                  <h2 className="text-2xl font-bold text-center mb-2">Checkout</h2>
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center mb-6 border border-blue-100 dark:border-blue-800">
                      <p className="text-sm text-[var(--text-secondary)]">Selected Plan</p>
                      <p className="font-bold text-xl text-blue-600 dark:text-blue-400">{selectedPlan.plan} <span className="text-gray-400 mx-2">|</span> ₹{selectedPlan.amount}</p>
                  </div>
                  <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      initiatePayment({
                          name: formData.get('name') as string,
                          email: formData.get('email') as string,
                          phone: formData.get('phone') as string
                      });
                  }} className="space-y-4">
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Full Name</label>
                          <input name="name" defaultValue={userData?.name || ''} required className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Email Address</label>
                          <input name="email" type="email" defaultValue={userData?.email || ''} required className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="space-y-1">
                          <label className="text-xs font-bold text-[var(--text-secondary)] uppercase">Phone Number</label>
                          <input name="phone" type="tel" defaultValue={userData?.phone || ''} required pattern="\d{10}" title="10 digit phone number" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <button type="submit" className="w-full bg-green-500 text-white py-3.5 rounded-lg font-bold hover:bg-green-600 transition shadow-lg mt-2">Make Payment</button>
                  </form>
              </div>
          </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-[var(--bg-secondary)] p-8 rounded-2xl max-w-sm w-full text-center animate-bounce-in shadow-2xl">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${showConfirmationModal.status === 'success' ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                      <i className={`fas ${showConfirmationModal.status === 'success' ? 'fa-check' : 'fa-times'} text-4xl`}></i>
                  </div>
                  <h3 className="text-xl font-bold mb-2">{showConfirmationModal.status === 'success' ? 'Payment Successful!' : 'Payment Failed'}</h3>
                  <p className="text-[var(--text-secondary)] mb-6 text-sm">{showConfirmationModal.message}</p>
                  <button onClick={() => setShowConfirmationModal(null)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold w-full hover:bg-blue-700 transition">Continue</button>
              </div>
          </div>
      )}
      
      {/* Profile/Crop Modals (Rest of code remains same, omitted for brevity as functionality is unchanged) */}
      {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
              <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl w-full max-w-md p-8 relative">
                  <button onClick={() => setShowProfileModal(false)} className="absolute top-4 right-4 text-[var(--text-secondary)] text-2xl">&times;</button>
                  <h2 className="text-2xl font-bold text-center mb-6">Edit Profile</h2>
                  <div className="flex justify-center mb-6 relative group w-24 mx-auto">
                      <img src={userData?.profile_pic} className="w-24 h-24 rounded-full object-cover border-2 border-blue-500" alt="Profile" />
                      <label className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition">
                          <i className="fas fa-camera text-white text-2xl"></i>
                          <input type="file" className="hidden" accept="image/*" onChange={handleImageFileChange} />
                      </label>
                  </div>
                  <div className="space-y-4">
                      <input ref={nameInputRef} defaultValue={userData?.name || ''} placeholder="Name" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3" />
                      <input ref={emailInputRef} defaultValue={userData?.email || ''} disabled className="w-full bg-gray-100 dark:bg-gray-800 border border-[var(--border-color)] rounded-lg p-3 cursor-not-allowed opacity-70" />
                      <input ref={phoneInputRef} defaultValue={userData?.phone || ''} placeholder="Phone" className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-3" />
                      <button onClick={handleProfileSave} disabled={profileSaving} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700">{profileSaving ? 'Saving...' : 'Save Changes'}</button>
                      <button onClick={handleLogout} className="w-full text-red-500 hover:underline text-sm">Logout</button>
                  </div>
              </div>
          </div>
      )}

      {showCropModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90">
              <div className="bg-[var(--bg-secondary)] p-6 rounded-xl w-full max-w-lg">
                  <h3 className="text-xl font-bold mb-4 text-center">Crop Image</h3>
                  <div className="h-64 bg-black mb-4">
                      <img ref={imageElementRef} src={imageToCrop || ''} alt="Crop" className="max-w-full h-full block" />
                  </div>
                  <div className="flex justify-end gap-4">
                      <button onClick={() => setShowCropModal(false)} className="px-4 py-2 bg-gray-500 text-white rounded-lg">Cancel</button>
                      <button onClick={handleCropSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Save</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Dashboard;

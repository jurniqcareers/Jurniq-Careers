import React, { useState, useEffect, useRef } from 'react';
import { User, Session } from '../types';
import { db } from '../services/firebaseService';
import { collection, query, onSnapshot, doc } from 'firebase/firestore';
import { API } from '@/services/apiConfig';

interface SessionsProps {
  user: User | null;
  onRequireAuth: () => void;
}

// Helper to load Cashfree SDK
const loadCashfreeSDK = () => {
  return new Promise((resolve) => {
    if (window.Cashfree) resolve(true);
    else {
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    }
  });
};

const Sessions: React.FC<SessionsProps> = ({ user, onRequireAuth }) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [registrationSession, setRegistrationSession] = useState<Session | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'VERIFYING' | 'SUCCESS' | 'FAILED' | null>(null);
  const cashfreeRef = useRef<any>(null);

  // Initial Load & Payment Verification
  useEffect(() => {
    // 1. Initialize Cashfree
    loadCashfreeSDK().then(() => {
       if(window.Cashfree) {
           try {
             cashfreeRef.current = new window.Cashfree({ mode: "production" });
           } catch(e) { console.error("Cashfree Init Error", e); }
       }
    });

    // 2. Fetch Sessions
    const q = query(collection(db, "sessions"));
    const unsub = onSnapshot(q, (snap) => {
      const list: Session[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() } as Session));
      setSessions(list);
    });

    // 3. Check for Payment Redirect Params
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const orderId = params.get("order_id");

    if (sessionId && orderId) {
        setPaymentStatus("VERIFYING");
        
        const successRef = doc(db, "session_registrations", sessionId, "successful", orderId);
        const failedRef = doc(db, "session_registrations", sessionId, "failed", orderId);

        const unsubSuccess = onSnapshot(successRef, (snap) => {
            if (snap.exists()) setPaymentStatus("SUCCESS");
        });
        const unsubFailed = onSnapshot(failedRef, (snap) => {
            if (snap.exists()) setPaymentStatus("FAILED");
        });

        // Clean URL
        window.history.replaceState({}, "", window.location.pathname);
        
        return () => {
            unsubSuccess();
            unsubFailed();
            unsub();
        };
    }

    return () => unsub();
  }, []);

  const handleRegisterClick = (session: Session) => {
      setRegistrationSession(session);
      setShowRegistrationModal(true);
  };

  const startPayment = async (payload: any) => {
      try {
          if(!cashfreeRef.current) await loadCashfreeSDK();
          
          const res = await fetch(
              API.createSessionOrder,
              {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payload),
              }
          );

          const data = await res.json();
          if (!data.payment_session_id) throw new Error("Invalid payment session");

          // Re-init if needed
          if(!cashfreeRef.current) cashfreeRef.current = new window.Cashfree({ mode: "production" });

          await cashfreeRef.current.checkout({
              paymentSessionId: data.payment_session_id,
              redirectTarget: "_self",
          });
      } catch (err) {
          console.error("Payment Init Failed:", err);
          alert("Could not initiate payment. Please try again.");
      }
  };

  const formatDate = (startTime: any) => {
      if (!startTime) return { full: "Coming Soon", date: "Coming Soon", time: "" };
      const d = startTime.seconds ? new Date(startTime.seconds * 1000) : new Date(startTime);
      if (isNaN(d.getTime())) return { full: "Invalid Date", date: "Invalid", time: "" };
      
      return {
          full: d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
          date: d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric" }),
          time: d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })
      };
  };

  // --- SUB-COMPONENTS ---

  const PaymentStatusModal = () => {
      if (!paymentStatus) return null;
      const isSuccess = paymentStatus === 'SUCCESS';
      const isVerifying = paymentStatus === 'VERIFYING';

      return (
          <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center">
                  <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isVerifying ? 'bg-blue-100 text-blue-500' : isSuccess ? 'bg-green-100 text-green-500' : 'bg-red-100 text-red-500'}`}>
                      <i className={`fas ${isVerifying ? 'fa-spinner fa-spin' : isSuccess ? 'fa-check' : 'fa-exclamation-triangle'} text-2xl`}></i>
                  </div>
                  <h3 className="text-lg font-bold mb-2">
                      {isVerifying ? "Verifying Payment..." : isSuccess ? "Payment Successful!" : "Payment Failed"}
                  </h3>
                  <p className="text-gray-500 text-sm mb-6">
                      {isVerifying ? "Please wait while we confirm your registration..." : isSuccess ? "You have successfully registered for this session." : "Something went wrong. Please try again."}
                  </p>
                  <button 
                    onClick={() => setPaymentStatus(null)}
                    disabled={isVerifying}
                    className={`w-full py-2.5 rounded-xl font-bold text-white text-sm ${isVerifying ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                      {isVerifying ? "Please Wait" : "Continue"}
                  </button>
              </div>
          </div>
      );
  };

  const RegistrationModal = () => {
      const [form, setForm] = useState({ firstName: '', lastName: '', email: user?.email || '', phone: '', grade: '' });
      const [processing, setProcessing] = useState(false);

      if (!showRegistrationModal || !registrationSession) return null;

      const handleSubmit = async (e: React.FormEvent) => {
          e.preventDefault();
          setProcessing(true);
          const dateStr = getSessionDateString(registrationSession.startTime);
          
          const payload = {
              sessionId: registrationSession.id,
              sessionTitle: registrationSession.title,
              sessionDateString: dateStr,
              amount: Number(registrationSession.discounted_price) || 0,
              returnUrl: window.location.href.split("?")[0],
              customer: {
                  name: `${form.firstName} ${form.lastName}`,
                  email: form.email,
                  phone: form.phone,
                  grade: form.grade,
              },
          };
          
          // Close modal then start payment logic (so modal doesn't block redirection/UI)
          setShowRegistrationModal(false);
          await startPayment(payload);
          setProcessing(false); // In case payment fails synchronously or we verify later
      };

      return (
          <div className="fixed inset-0 z-[150] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
                  <button onClick={() => setShowRegistrationModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"><i className="fas fa-times text-lg"></i></button>
                  <h2 className="text-lg font-bold mb-1">Register for Session</h2>
                  <p className="text-primary-blue mb-4 text-sm font-medium">{registrationSession.title}</p>
                  
                  <form onSubmit={handleSubmit} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                          <input required value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} placeholder="First Name" className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-primary-blue" />
                          <input required value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} placeholder="Last Name" className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-primary-blue" />
                      </div>
                      <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-primary-blue" />
                      <input required value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="Phone Number" className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-primary-blue" />
                      <select required value={form.grade} onChange={e => setForm({...form, grade: e.target.value})} className="border rounded-lg px-3 py-2 w-full text-sm outline-none focus:ring-2 focus:ring-primary-blue bg-white">
                          <option value="">Select Grade</option>
                          {[...Array(12).keys()].map(i => <option key={i} value={i+1}>Class {i+1}</option>)}
                      </select>
                      
                      <div className="bg-blue-50 p-3 rounded-lg text-right font-bold text-base text-primary-blue">
                          {Number(registrationSession.discounted_price) === 0 ? "Free" : `₹${registrationSession.discounted_price}`}
                      </div>
                      <button type="submit" disabled={processing} className="w-full bg-primary-blue text-white py-2.5 rounded-lg font-bold hover:bg-primary-dark text-sm transition-colors">
                          {processing ? "Processing..." : "Proceed to Payment"}
                      </button>
                  </form>
              </div>
          </div>
      );
  };

  // Helper logic for dates
  const getSessionDateString = (startTime: any) => {
      let d;
      if (!startTime) return "unknown-date";
      if (startTime.seconds) d = new Date(startTime.seconds * 1000);
      else d = new Date(startTime);
      if (isNaN(d.getTime())) return "unknown-date";
      return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
  };

  const isSessionInPast = (startTime: any) => {
      if (!startTime) return false;
      let d;
      if (startTime.seconds) d = new Date(startTime.seconds * 1000);
      else d = new Date(startTime);
      if (isNaN(d.getTime())) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sessionDate = new Date(d);
      sessionDate.setHours(0, 0, 0, 0);
      
      return sessionDate.getTime() < today.getTime();
  };

  // --- RENDER ---

  if (viewingSession) {
      const { date, time } = formatDate(viewingSession.startTime);
      const price = Number(viewingSession.discounted_price) === 0 ? "Free" : `₹${viewingSession.discounted_price}`;
      const originalPrice = viewingSession.price || "999";

      return (
          <div className="min-h-screen bg-gray-50 pt-[60px] pb-20">
              <PaymentStatusModal />
              <RegistrationModal />
              
              {/* Hero Banner */}
              <div className="relative w-full h-[380px] md:h-[460px] lg:h-[520px] overflow-hidden bg-gray-900">
                  {viewingSession.src_img ? (
                      <img src={viewingSession.src_img} alt={viewingSession.title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                      <div className={`absolute inset-0 w-full h-full ${viewingSession.thumbnailColor || "bg-blue-100"}`}></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  
                  <div className="absolute top-6 left-6 z-20">
                      <button onClick={() => setViewingSession(null)} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition">
                          <i className="fas fa-arrow-left text-xl"></i>
                      </button>
                  </div>

                  <div className="absolute bottom-0 left-0 w-full p-6 md:p-10 z-10">
                      <div className="max-w-4xl">
                          <span className="px-3 py-1.5 rounded bg-blue-600 text-white font-bold text-[10px] uppercase">{viewingSession.class_type || "Masterclass"}</span>
                          <h1 className="text-3xl md:text-5xl font-extrabold text-white mt-3 mb-2 drop-shadow-lg">{viewingSession.title}</h1>
                          <div className="flex flex-wrap items-center gap-6 text-white/90 text-sm font-medium">
                              <div className="flex items-center gap-2"><i className="fas fa-calendar-alt text-primary-blue"></i> {date}</div>
                              <div className="flex items-center gap-2"><i className="fas fa-clock text-primary-blue"></i> {time}</div>
                              <div className="flex items-center gap-2"><i className="fas fa-video text-primary-blue"></i> Online</div>
                          </div>
                      </div>
                  </div>
              </div>

              {/* Content Grid */}
              <div className="container mx-auto px-4 py-8 max-w-6xl">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                      {/* Left Details */}
                      <div className="lg:col-span-8 space-y-6">
                          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                              <h3 className="font-bold mb-3 text-lg text-gray-800">About this Session</h3>
                              <p className="text-gray-600 leading-relaxed text-sm">{viewingSession.description}</p>
                          </div>

                          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                              <h3 className="font-bold mb-4 text-lg text-gray-800 flex items-center gap-2"><i className="fas fa-bullseye text-primary-blue"></i> What you'll learn</h3>
                              <div className="space-y-3">
                                  {(viewingSession.learn || []).map((item, i) => (
                                      <div key={i} className="flex items-start gap-3">
                                          <i className="fas fa-check-circle text-green-600 mt-1 shrink-0"></i>
                                          <span className="text-gray-700 text-sm">{item}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                              <h3 className="font-bold mb-4 text-lg text-gray-800 flex items-center gap-2"><i className="fas fa-users text-primary-blue"></i> Who should attend</h3>
                              <ul className="space-y-3">
                                  {(viewingSession.attend_who || []).map((item, i) => (
                                      <li key={i} className="flex items-start gap-3">
                                          <span className="w-2 h-2 rounded-full bg-primary-blue mt-2 shrink-0"></span>
                                          <span className="text-gray-700 text-sm">{item}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>

                          <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                              <h3 className="font-bold mb-4 text-lg text-gray-800">Your Mentor</h3>
                              <div className="flex items-center gap-6">
                                  <img src={viewingSession.mentor_img || "https://placehold.co/120x120"} className="w-16 h-16 rounded-full object-cover border-2 border-gray-100 shadow-sm" alt="Mentor" />
                                  <div>
                                      <p className="font-bold text-lg text-gray-900">{viewingSession.mentor || "Mentor"}</p>
                                      <p className="text-primary-blue font-semibold mb-1 text-sm">{viewingSession.mentor_usp || "Expert Mentor"}</p>
                                      <p className="text-gray-500 text-xs">{viewingSession.mentor_desc || "Industry professional with years of experience."}</p>
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Right Sidebar (Pricing & Action) */}
                      <div className="lg:col-span-4 relative">
                          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 sticky top-[90px]">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Session Price</p>
                              <div className="flex items-baseline gap-3 mb-4">
                                  <span className="text-3xl font-extrabold text-gray-900">{price}</span>
                                  <span className="line-through text-gray-400 text-base font-medium">₹{originalPrice}</span>
                              </div>
                              <div className="text-green-700 bg-green-50 px-3 py-1.5 inline-flex items-center gap-2 rounded-md text-[10px] font-bold mb-6 border border-green-100">
                                  <i className="fas fa-tag"></i>
                                  {Number(viewingSession.discounted_price) === 0 ? "100% Scholarship Applied" : "Limited Time Offer"}
                              </div>
                              {isSessionInPast(viewingSession.startTime) ? (
                                  <button disabled className="w-full bg-gray-400 text-white py-3 rounded-xl font-bold text-base cursor-not-allowed shadow-md">
                                      Registration Closed
                                  </button>
                              ) : (
                                  <button onClick={() => handleRegisterClick(viewingSession)} className="w-full bg-primary-blue text-white py-3 rounded-xl font-bold text-base hover:bg-primary-blue-dark shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5">
                                      Register Now
                                  </button>
                              )}
                              <p className="text-center text-[10px] text-gray-400 mt-4"><i className="fas fa-lock text-[8px] mr-1"></i>Secure payment powered by Cashfree</p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // --- HOME VIEW (List) ---
  return (
      <div className="py-20 bg-gray-50 min-h-screen">
          <PaymentStatusModal />
          <div className="container mx-auto px-6 max-w-6xl">
              <h1 className="text-3xl font-bold mb-8 text-gray-900">Upcoming <span className="text-primary-blue">Sessions</span></h1>
              {sessions.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                      <p className="text-gray-500 text-lg">No sessions available at the moment.</p>
                  </div>
              ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                      {sessions.map((session) => (
                          <div key={session.id} onClick={() => setViewingSession(session)} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden group">
                              <div className="h-48 w-full overflow-hidden relative">
                                  {session.src_img ? (
                                      <img src={session.src_img} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={session.title} />
                                  ) : (
                                      <div className={`h-full ${session.thumbnailColor || "bg-blue-100"}`}></div>
                                  )}
                                  <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
                                       <span className="text-white text-xs font-bold bg-primary-blue px-2 py-1 rounded">{session.class_type || "Session"}</span>
                                  </div>
                              </div>
                              <div className="p-5 space-y-3">
                                  <h3 className="text-lg font-bold text-gray-900 leading-tight group-hover:text-primary-blue transition-colors line-clamp-2">{session.title || "Untitled Session"}</h3>
                                  <div className="flex items-center gap-2 text-gray-500 text-xs font-medium">
                                      <i className="fas fa-calendar-alt text-primary-blue"></i>
                                      {formatDate(session.startTime).full}
                                  </div>
                                  <div className="pt-3">
                                      <button className="w-full bg-blue-50 text-primary-blue px-4 py-2.5 rounded-lg text-sm font-bold group-hover:bg-primary-blue group-hover:text-white transition-colors">
                                          {session.status === "ended" ? "Watch Recording" : "View Details"}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      </div>
  );
};

export default Sessions;
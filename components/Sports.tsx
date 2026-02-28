
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { getAcademyRoadmap, getAcademyFees, getAcademyOverview } from '../services/geminiService';
import { db } from '../services/firebaseService';
import { doc, updateDoc, arrayUnion, arrayRemove, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

interface SportsProps {
  user: User | null;
  onRequireAuth: () => void;
  onBack: () => void;
}

declare global {
  interface Window {
    google: any;
  }
}

interface Academy {
  id: string;
  name: string;
  sport: string;
  rating: number;
  address: string;
  photoUrl: string | null;
  geometry?: any;
  place_id: string;
}

const INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
    "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
    "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
    "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Jammu and Kashmir", "Puducherry", "Chandigarh"
];

const CITY_DATA: {[key: string]: string[]} = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Tirupati", "Kakinada", "Anantapur", "Vizianagaram"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
  "Assam": ["Guwahati", "Silchar", "Dibrugarh", "Jorhat", "Nagaon", "Tinsukia", "Tezpur"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Purnia", "Darbhanga", "Bihar Sharif", "Arrah", "Begusarai", "Katihar"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg", "Rajnandgaon", "Raigarh", "Jagdalpur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar", "Junagadh", "Gandhidham", "Anand"],
  "Haryana": ["Faridabad", "Gurugram", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Baddi", "Nahan"],
  "Jharkhand": ["Jamshedpur", "Dhanbad", "Ranchi", "Bokaro Steel City", "Deoghar", "Phusro", "Hazaribagh"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", "Davangere", "Ballari", "Vijayapura", "Shivamogga", "Tumakuru"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Kollam", "Thrissur", "Kannur", "Alappuzha", "Palakkad"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur", "Amravati", "Navi Mumbai", "Kolhapur", "Akola", "Jalgaon"],
  "Manipur": ["Imphal"],
  "Meghalaya": ["Shillong", "Tura"],
  "Mizoram": ["Aizawl"],
  "Nagaland": ["Dimapur", "Kohima"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Bharatpur"],
  "Sikkim": ["Gangtok"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Tiruppur", "Vellore", "Erode", "Thoothukudi"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam", "Khammam"],
  "Tripura": ["Agartala"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj", "Bareilly", "Noida", "Greater Noida", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur", "Rishikesh"],
  "West Bengal": ["Kolkata", "Asansol", "Siliguri", "Durgapur", "Bardhaman", "Malda", "Baharampur", "Habra", "Kharagpur"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "East Delhi", "West Delhi", "Dwarka", "Rohini"],
  "Chandigarh": ["Chandigarh"],
  "Puducherry": ["Puducherry"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag"]
};

const SPORTS_LIST = [
    "Archery", "Athletics", "Badminton", "Basketball", "Boxing", "Chess", "Cricket", "Cycling", "Football", 
    "Golf", "Gymnastics", "Hockey", "Judo", "Kabaddi", "Karate", "Kho Kho", "Shooting", "Skating", 
    "Squash", "Swimming", "Table Tennis", "Taekwondo", "Tennis", "Volleyball", "Weightlifting", "Wrestling", "Yoga"
];

// Age Criteria & Trophies Knowledge Base
const SPORT_CRITERIA: any = {
    "Cricket": { 
        min: 6, max: 45, 
        trophies: {
            "Under-14": "School Nationals, Vijay Merchant Trophy",
            "Under-16": "Vijay Merchant Trophy, Harris Shield",
            "Under-19": "Cooch Behar Trophy, Vinoo Mankad Trophy",
            "Under-23": "CK Nayudu Trophy",
            "Open": "Ranji Trophy, IPL, Duleep Trophy"
        }
    },
    "Football": { 
        min: 5, max: 35, 
        trophies: {
            "Under-13": "Subroto Cup (Sub-Junior)",
            "Under-15": "Nike Premier Cup",
            "Under-17": "Subroto Cup (Junior), BC Roy Trophy",
            "Under-21": "Santosh Trophy (Selection)",
            "Open": "ISL, I-League, Santosh Trophy"
        }
    },
    "Badminton": { 
        min: 6, max: 40, 
        trophies: {
            "Under-13": "Sub-Junior Nationals (Mini)",
            "Under-15": "Sub-Junior Nationals",
            "Under-17": "Junior Nationals",
            "Under-19": "Junior National Championship",
            "Open": "Premier Badminton League, Senior Nationals"
        }
    },
    "Tennis": {
        min: 5, max: 40,
        trophies: {
            "Under-12": "AITA Talent Series",
            "Under-14": "AITA Championship Series",
            "Under-16": "AITA Super Series",
            "Under-18": "Junior Nationals, ITF Juniors",
            "Open": "Fenesta Open, AITA Men's/Women's"
        }
    },
    "Chess": {
        min: 4, max: 99,
        trophies: {
            "Under-9": "National Schools Chess Championship",
            "Under-13": "National Sub-Junior",
            "Under-17": "National Junior",
            "Open": "National Premier, FIDE Ratings"
        }
    },
    "Swimming": {
        min: 4, max: 35,
        trophies: {
            "Group IV (10-12)": "State Age Group",
            "Group III (13-14)": "Sub-Junior Nationals",
            "Group II (15-17)": "Junior Nationals",
            "Open": "Senior Nationals, National Games"
        }
    }
};

const Sports: React.FC<SportsProps> = ({ user, onRequireAuth, onBack }) => {
  const [view, setView] = useState<'form' | 'results' | 'details'>('form');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  const [academies, setAcademies] = useState<Academy[]>([]);
  const [selectedAcademy, setSelectedAcademy] = useState<any>(null);
  
  // Form State
  const [form, setForm] = useState({ state: '', city: '', sport: '', age: '' });
  const [manualCity, setManualCity] = useState(false);
  
  // Modals
  const [modalData, setModalData] = useState<{title: string, content: React.ReactNode} | null>(null);
  const [eligibilityModal, setEligibilityModal] = useState<{
      isOpen: boolean;
      status: 'eligible' | 'ineligible';
      message: string;
      category?: string;
      competitions?: string;
  }>({ isOpen: false, status: 'eligible', message: '' });

  const [overview, setOverview] = useState<string | null>(null);
  
  // Saving Logic
  const [isSaved, setIsSaved] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'info'} | null>(null);

  // Maps & Autocomplete
  const mapRef = useRef<HTMLDivElement>(null);
  const placesService = useRef<any>(null);
  const cityAutocompleteRef = useRef<HTMLInputElement>(null);

  // Initialize Google Maps & Autocomplete
  useEffect(() => {
    const initMaps = () => {
        if (!window.google) {
            const script = document.createElement('script');
            const apiKey = "AIzaSyAs4buHwRCVk6i6FdDKvo_T09Ayp7TrEig"; 
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                initializeServices();
            };
            document.head.appendChild(script);
        } else {
            initializeServices();
        }
    };

    const initializeServices = () => {
        if (!window.google) return;
        placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
        checkDeepLink();
        
        // Initialize City Autocomplete
        if (cityAutocompleteRef.current) {
            const autocomplete = new window.google.maps.places.Autocomplete(cityAutocompleteRef.current, {
                types: ['(cities)'],
                componentRestrictions: { country: 'in' },
                fields: ['name', 'address_components', 'geometry']
            });

            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (place && place.name) {
                    // Try to extract state
                    let stateName = '';
                    place.address_components?.forEach((component: any) => {
                        if (component.types.includes('administrative_area_level_1')) {
                            stateName = component.long_name;
                        }
                    });

                    // Update Form
                    setForm(prev => ({
                        ...prev,
                        city: place.name,
                        state: stateName || prev.state
                    }));
                    
                    // If the city isn't in our list for that state, switch to manual mode visually
                    const stateCities = CITY_DATA[stateName] || [];
                    if (!stateCities.includes(place.name)) {
                        setManualCity(true);
                    } else {
                        setManualCity(false);
                    }
                }
            });
        }
    };

    initMaps();
  }, [view]);

  // Check saved status
  useEffect(() => {
      if (!user || !selectedAcademy) return;
      const userRef = doc(db, 'users', user.uid);
      const unsub = onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
              const data = docSnap.data();
              const savedList = data.saved_academies || [];
              const exists = savedList.some((item: any) => item.id === selectedAcademy.place_id);
              setIsSaved(exists);
          }
      });
      return () => unsub();
  }, [user, selectedAcademy]);

  // Toast Timer
  useEffect(() => {
      if(toast) {
          const timer = setTimeout(() => setToast(null), 3000);
          return () => clearTimeout(timer);
      }
  }, [toast]);

  const checkDeepLink = () => {
      const targetId = localStorage.getItem('jurniq_target_academy_id');
      if (targetId && placesService.current) {
          localStorage.removeItem('jurniq_target_academy_id');
          handleViewDetails({ place_id: targetId } as Academy);
      }
  };

  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Regex to allow only numbers and restrict to 2 digits
      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
      setForm({ ...form, age: val });
  };

  const checkEligibility = (e: React.FormEvent) => {
      e.preventDefault();
      if (!form.city || !form.sport || !form.age) {
          alert("Please fill all fields");
          return;
      }

      const age = parseInt(form.age, 10);
      const sport = form.sport;
      
      // Default criteria if sport not in specific list
      const criteria = SPORT_CRITERIA[sport] || { 
          min: 5, max: 50, 
          trophies: { 
              "Under-14": "Junior Level", 
              "Under-19": "Senior Level", 
              "Open": "Open Category" 
          } 
      };

      if (age < criteria.min) {
          setEligibilityModal({
              isOpen: true,
              status: 'ineligible',
              message: `You are currently too young for professional ${sport} academies. Most academies start accepting students from age ${criteria.min}.`
          });
      } else if (age > criteria.max) {
          setEligibilityModal({
              isOpen: true,
              status: 'ineligible',
              message: `You might be above the typical age limit for professional academy intake for ${sport} (Max: ${criteria.max}). However, you can look for recreational clubs.`
          });
      } else {
          // Determine Category
          let category = "Open";
          let competition = criteria.trophies["Open"] || "Open Tournaments";

          // Sort keys to find matching age bracket (simple numeric extraction from keys like "Under-14")
          const brackets = Object.keys(criteria.trophies).sort((a,b) => {
              const numA = parseInt(a.replace(/[^0-9]/g, '') || '99');
              const numB = parseInt(b.replace(/[^0-9]/g, '') || '99');
              return numA - numB;
          });

          for (const bracket of brackets) {
              const limit = parseInt(bracket.replace(/[^0-9]/g, '') || '99');
              if (age <= limit) {
                  category = bracket;
                  competition = criteria.trophies[bracket];
                  break;
              }
          }

          setEligibilityModal({
              isOpen: true,
              status: 'eligible',
              message: `You are eligible for ${sport} training!`,
              category: category,
              competitions: competition
          });
      }
  };

  const handleConfirmSearch = () => {
      setEligibilityModal({ ...eligibilityModal, isOpen: false });
      
      if (!placesService.current) { alert("Maps service not ready. Please refresh."); return; }

      setLoading(true);
      const categoryQuery = eligibilityModal.category ? `for ${eligibilityModal.category}` : '';
      setLoadingText(`Searching for ${form.sport} academies ${categoryQuery} in ${form.city}...`);

      // Modified query to include age category if applicable
      const query = `${form.sport} academy ${categoryQuery} in ${form.city}, ${form.state}`;
      const request = {
          query: query,
          fields: ['name', 'place_id', 'rating', 'photos', 'formatted_address', 'geometry']
      };

      placesService.current.textSearch(request, (results: any[], status: any) => {
          setLoading(false);
          if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
              const mapped = results.map(place => ({
                  id: place.place_id,
                  place_id: place.place_id,
                  name: place.name,
                  sport: form.sport,
                  rating: place.rating || 0,
                  address: place.formatted_address,
                  photoUrl: place.photos && place.photos.length > 0 ? place.photos[0].getUrl({ maxWidth: 400 }) : null,
                  geometry: place.geometry
              }));
              setAcademies(mapped);
              setView('results');
          } else {
              setAcademies([]);
              setView('results');
          }
      });
  };

  const handleViewDetails = (academy: Academy) => {
      setLoading(true);
      setLoadingText("Fetching academy details...");
      setOverview(null);

      const request = {
          placeId: academy.place_id,
          fields: ['name', 'international_phone_number', 'formatted_address', 'website', 'photos', 'geometry', 'rating', 'place_id']
      };

      placesService.current.getDetails(request, async (place: any, status: any) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
              const fullDetails = { ...place, sport: academy.sport || form.sport || 'Sports' };
              setSelectedAcademy(fullDetails);
              setView('details');
              setLoading(false);
              
              const aiData = await getAcademyOverview(fullDetails.name, fullDetails.formatted_address);
              setOverview(aiData);
          } else {
              setLoading(false);
              alert("Could not fetch details.");
          }
      });
  };

  useEffect(() => {
      if (view === 'details' && selectedAcademy && mapRef.current && window.google) {
          const map = new window.google.maps.Map(mapRef.current, {
              center: selectedAcademy.geometry.location,
              zoom: 15
          });
          new window.google.maps.Marker({
              position: selectedAcademy.geometry.location,
              map: map,
              title: selectedAcademy.name
          });
      }
  }, [view, selectedAcademy]);

  const handleShowRoadmap = async () => {
      setModalData({ title: 'Generating Roadmap...', content: <div className="loader mx-auto"></div> });
      const data = await getAcademyRoadmap(selectedAcademy.sport, selectedAcademy.name);
      if (data) {
          setModalData({
              title: `Roadmap: ${selectedAcademy.name}`,
              content: (
                  <div className="space-y-6 relative border-l-4 border-indigo-200 pl-6 my-4">
                      {data.map((step: any, i: number) => (
                          <div key={i} className="relative">
                              <div className="absolute w-4 h-4 bg-indigo-600 rounded-full -left-[33px] top-1 border-2 border-white"></div>
                              <h4 className="text-lg font-bold text-gray-800">{step.stage}</h4>
                              <p className="text-gray-600 text-sm mt-1">{step.description}</p>
                              <div className="mt-2 bg-indigo-50 p-3 rounded text-xs text-indigo-800 font-semibold">
                                  Goal: {step.competitions}
                              </div>
                          </div>
                      ))}
                  </div>
              )
          });
      } else {
          setModalData({ title: 'Error', content: 'Could not generate roadmap.' });
      }
  };

  const handleShowFees = async () => {
      setModalData({ title: 'Fetching Fees...', content: <div className="loader mx-auto"></div> });
      const fees = await getAcademyFees(selectedAcademy.name, selectedAcademy.formatted_address);
      setModalData({
          title: 'Fee Structure (AI Estimation)',
          content: (
              <div className="prose text-gray-700 max-w-none">
                  {fees === 'NOT_FOUND' ? (
                      <p>We could not find public fee information for this academy. Please contact them directly.</p>
                  ) : (
                      <>
                        <div dangerouslySetInnerHTML={{ __html: fees }} />
                        <p className="text-xs text-gray-400 mt-4 italic border-t pt-2">* Information sourced by Personalised AI 'JurniQ AI' from public web data. Verify with the academy.</p>
                      </>
                  )}
              </div>
          )
      });
  };

  const handleToggleSave = async () => {
      if (!user) { onRequireAuth(); return; }
      
      const saveData = {
          id: selectedAcademy.place_id,
          name: selectedAcademy.name,
          address: selectedAcademy.formatted_address,
          sport: selectedAcademy.sport,
          savedAt: new Date().toISOString()
      };

      try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          
          if (!docSnap.exists()) {
              await setDoc(userRef, { saved_academies: [saveData] }, { merge: true });
              setToast({ message: "Academy Saved to Dashboard", type: 'success' });
          } else {
              if (isSaved) {
                  const currentSaved = docSnap.data().saved_academies || [];
                  const newSaved = currentSaved.filter((item: any) => item.id !== selectedAcademy.place_id);
                  await updateDoc(userRef, { saved_academies: newSaved });
                  setToast({ message: "Academy Removed from Dashboard", type: 'info' });
              } else {
                  await updateDoc(userRef, {
                      saved_academies: arrayUnion(saveData)
                  });
                  setToast({ message: "Academy Saved to Dashboard", type: 'success' });
              }
          }
      } catch (e) {
          console.error(e);
          alert("Failed to update dashboard.");
      }
  };

  if (loading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <div className="loader w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 font-medium">{loadingText}</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans relative">
      
      {/* Toast Notification */}
      {toast && (
          <div className={`fixed top-24 right-6 z-50 px-6 py-3 rounded-lg shadow-lg text-white font-semibold flex items-center gap-3 animate-fade-in-up ${toast.type === 'success' ? 'bg-green-600' : 'bg-gray-700'}`}>
              <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}`}></i>
              {toast.message}
          </div>
      )}

      {/* Generic Modal */}
      {modalData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setModalData(null)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 relative max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setModalData(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-2xl">&times;</button>
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">{modalData.title}</h3>
                  <div>{modalData.content}</div>
              </div>
          </div>
      )}

      {/* Eligibility Modal */}
      {eligibilityModal.isOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative text-center animate-bounce-in">
                  <button 
                      onClick={() => setEligibilityModal({...eligibilityModal, isOpen: false})} 
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
                  >
                      &times;
                  </button>
                  {eligibilityModal.status === 'ineligible' ? (
                      <>
                          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><i className="fas fa-exclamation-triangle"></i></div>
                          <h3 className="text-xl font-bold text-gray-800 mb-2">Age Criteria Check</h3>
                          <p className="text-gray-600 mb-6">{eligibilityModal.message}</p>
                          <button onClick={() => setEligibilityModal({...eligibilityModal, isOpen: false})} className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Close</button>
                      </>
                  ) : (
                      <>
                          <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl"><i className="fas fa-check"></i></div>
                          <h3 className="text-xl font-bold text-green-600 mb-1">You are Eligible!</h3>
                          <p className="text-gray-500 text-sm mb-6">Based on your age ({form.age}), here is your category:</p>
                          
                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-left mb-6">
                              <div className="mb-3">
                                  <span className="text-xs text-blue-500 font-bold uppercase">Playing Category</span>
                                  <p className="text-lg font-bold text-gray-800">{eligibilityModal.category}</p>
                              </div>
                              <div>
                                  <span className="text-xs text-blue-500 font-bold uppercase">Eligible Trophies/Competitions</span>
                                  <p className="text-sm font-medium text-gray-700">{eligibilityModal.competitions}</p>
                              </div>
                          </div>

                          <button onClick={handleConfirmSearch} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 shadow-lg">
                              Find Academies for {eligibilityModal.category}
                          </button>
                          
                          <button 
                              onClick={() => setEligibilityModal({...eligibilityModal, isOpen: false})} 
                              className="mt-3 text-gray-500 hover:text-gray-700 text-sm font-medium underline"
                          >
                              Close & Edit Details
                          </button>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* FORM VIEW */}
      {view === 'form' && (
          <div className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center relative" style={{ backgroundImage: "url('https://placehold.co/1920x1080/e0e7ff/3730a3?text=Sports+Background')" }}>
              <div className="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
              <div className="bg-white/95 p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10 animate-fade-in-up">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-3xl font-bold text-gray-800">Find Academy</h2>
                      <button onClick={onBack} className="text-sm text-gray-500 hover:text-indigo-600">Back to Dashboard</button>
                  </div>
                  <form onSubmit={checkEligibility} className="space-y-4">
                      
                      {/* Direct City Search (Autocomplete) */}
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Search City Directly</label>
                          <div className="relative">
                              <i className="fas fa-search absolute left-3 top-3.5 text-gray-400"></i>
                              <input 
                                ref={cityAutocompleteRef}
                                type="text"
                                className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-400"
                                placeholder="e.g. Mumbai, Pune, Noida"
                              />
                          </div>
                      </div>

                      <div className="relative flex items-center py-2">
                          <div className="flex-grow border-t border-gray-300"></div>
                          <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-semibold uppercase">Or select manually</span>
                          <div className="flex-grow border-t border-gray-300"></div>
                      </div>

                      {/* Manual Selection */}
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">State</label>
                          <select 
                            value={form.state} 
                            onChange={e => {
                                setForm({ ...form, state: e.target.value, city: '' });
                                setManualCity(false);
                            }} 
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                              <option value="">Select State</option>
                              {INDIAN_STATES.sort().map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">City</label>
                          {!manualCity ? (
                              <select 
                                value={form.city} 
                                onChange={e => setForm({ ...form, city: e.target.value })} 
                                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                                disabled={!form.state}
                              >
                                  <option value="">Select City</option>
                                  {form.state && CITY_DATA[form.state]?.sort().map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                          ) : (
                              <input 
                                type="text"
                                value={form.city}
                                onChange={e => setForm({ ...form, city: e.target.value })}
                                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500 bg-blue-50"
                                placeholder="Enter City Name"
                              />
                          )}
                          {/* Helper to switch to text input if city not found */}
                          {form.state && !manualCity && (
                              <button type="button" onClick={() => setManualCity(true)} className="text-xs text-indigo-600 hover:underline mt-1">
                                  City not listed? Type manually
                              </button>
                          )}
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Sport</label>
                          <select 
                            value={form.sport} 
                            onChange={e => setForm({ ...form, sport: e.target.value })} 
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                              <option value="">Select Sport</option>
                              {SPORTS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Age (Years)</label>
                          <input 
                            type="text" 
                            maxLength={2} 
                            value={form.age} 
                            onChange={handleAgeChange} 
                            className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" 
                            placeholder="e.g. 14" 
                          />
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition shadow-lg mt-2">
                          Check Eligibility & Search
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* RESULTS VIEW */}
      {view === 'results' && (
          <div className="container mx-auto px-6 py-8">
              <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-800">Results for {form.sport} in {form.city}</h2>
                  <button onClick={() => setView('form')} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold hover:bg-gray-300">New Search</button>
              </div>
              
              {academies.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-xl shadow">
                      <p className="text-gray-500">No academies found. Try a different city or sport.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {academies.map((acad) => (
                          <div key={acad.id} onClick={() => handleViewDetails(acad)} className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:-translate-y-1 transition-transform group">
                              <div className="h-48 bg-gray-200 relative">
                                  {acad.photoUrl ? (
                                      <img src={acad.photoUrl} className="w-full h-full object-cover" alt={acad.name} />
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100"><i className="fas fa-image text-3xl"></i></div>
                                  )}
                                  <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold shadow flex items-center">
                                      <i className="fas fa-star text-yellow-400 mr-1"></i> {acad.rating.toFixed(1)}
                                  </div>
                              </div>
                              <div className="p-5">
                                  <h3 className="font-bold text-lg text-gray-900 mb-1 group-hover:text-indigo-600 transition">{acad.name}</h3>
                                  <p className="text-sm text-gray-500 line-clamp-2">{acad.address}</p>
                                  <button className="mt-4 w-full bg-indigo-50 text-indigo-600 py-2 rounded font-semibold text-sm hover:bg-indigo-100">View Details</button>
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* DETAILS VIEW */}
      {view === 'details' && selectedAcademy && (
          <div className="bg-white min-h-screen">
              <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm px-6 py-4 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800 truncate pr-4">{selectedAcademy.name}</h2>
                  <button onClick={() => setView('results')} className="text-gray-600 hover:text-indigo-600 font-medium flex items-center gap-2">
                      <i className="fas fa-arrow-left"></i> Back
                  </button>
              </div>
              
              <div className="container mx-auto px-6 py-8 max-w-5xl">
                  {/* Hero Image */}
                  <div className="h-64 md:h-96 rounded-2xl overflow-hidden shadow-lg mb-8 relative">
                      <img 
                        src={selectedAcademy.photos && selectedAcademy.photos.length > 0 ? selectedAcademy.photos[0].getUrl() : "https://placehold.co/1200x600/e0e7ff/3730a3?text=Academy"} 
                        alt={selectedAcademy.name} 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                          <div>
                              <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2">{selectedAcademy.name}</h1>
                              <p className="text-white/90 text-lg">{selectedAcademy.sport} Academy</p>
                          </div>
                      </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8">
                      {/* Left: Info */}
                      <div className="md:col-span-2 space-y-8">
                          {/* AI Overview Section */}
                          <div className="bg-white p-6 rounded-xl shadow-md border border-indigo-100">
                              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><i className="fas fa-sparkles text-yellow-500"></i> Academy Overview (Personalised AI 'JurniQ AI')</h3>
                              {overview ? (
                                  <div className="prose text-sm text-gray-700 max-w-none" dangerouslySetInnerHTML={{__html: overview}}></div>
                              ) : (
                                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                                      <div className="loader !w-4 !h-4 !border-2"></div> Fetching detailed insights...
                                  </div>
                              )}
                          </div>

                          <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                              <h3 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2"><i className="fas fa-info-circle text-indigo-500"></i> Academy Details</h3>
                              <div className="space-y-3 text-sm text-gray-700">
                                  <p className="flex items-start gap-3"><i className="fas fa-map-marker-alt mt-1 w-4 text-gray-400"></i> {selectedAcademy.formatted_address}</p>
                                  <p className="flex items-center gap-3"><i className="fas fa-phone w-4 text-gray-400"></i> {selectedAcademy.international_phone_number || 'N/A'}</p>
                                  {selectedAcademy.website && (
                                      <p className="flex items-center gap-3"><i className="fas fa-globe w-4 text-gray-400"></i> <a href={selectedAcademy.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Visit Website</a></p>
                                  )}
                                  <p className="flex items-center gap-3"><i className="fas fa-star w-4 text-gray-400"></i> {selectedAcademy.rating} / 5.0</p>
                              </div>
                          </div>

                          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                              <div ref={mapRef} className="w-full h-80 bg-gray-100"></div>
                          </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="space-y-4">
                          <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 sticky top-24">
                              <h3 className="font-bold text-gray-800 mb-4 text-center">Personalised AI 'JurniQ AI' Insights & Actions</h3>
                              <button onClick={handleShowRoadmap} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold mb-3 hover:bg-indigo-700 transition shadow-md flex items-center justify-center gap-2">
                                  <i className="fas fa-route"></i> Get Roadmap
                              </button>
                              <button onClick={handleShowFees} className="w-full bg-white text-indigo-600 border-2 border-indigo-600 py-3 rounded-lg font-bold hover:bg-indigo-50 transition flex items-center justify-center gap-2 mb-4">
                                  <i className="fas fa-coins"></i> Check Fees
                              </button>
                              <div className="border-t border-gray-100 my-4"></div>
                              <button 
                                onClick={handleToggleSave}
                                className={`w-full py-3 rounded-lg font-bold transition shadow flex items-center justify-center gap-2 ${isSaved ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-green-500 text-white hover:bg-green-600'}`}
                              >
                                  <i className={`fas ${isSaved ? 'fa-check' : 'fa-bookmark'}`}></i> {isSaved ? 'Saved to Dashboard' : 'Save to Dashboard'}
                              </button>
                              <p className="text-xs text-gray-500 mt-2 text-center">
                                  {isSaved ? "Click again to remove." : "Save for quick access later."}
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Sports;

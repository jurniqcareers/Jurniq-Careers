
import React, { useState, useEffect, useRef } from 'react';
import { User, AdvancedFormData, CareerRecommendation, SkillDetail, InterviewQuestion, RoadmapStep } from '../types';
import { generateAdvancedRecommendations, generateImage, generateSkillDetails, generateInterviewQuestions, generateRoadmap } from '../services/geminiService';
import { db } from '../services/firebaseService';
import { doc, updateDoc } from 'firebase/firestore';
import { API } from '@/services/apiConfig';

interface CareerPathProps {
  user: User | null;
  onRequireAuth: () => void;
}

const CareerPath: React.FC<CareerPathProps> = ({ user, onRequireAuth }) => {
  const [view, setView] = useState<'start' | 'modal'>('start');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Data States
  const [formData, setFormData] = useState<AdvancedFormData>({
    name: user?.displayName || '',
    classLevel: '12th',
    stream: '',
    marks: '',
    interests: [],
    strengths: [],
    environment: [],
    goal: ''
  });
  const [recommendations, setRecommendations] = useState<CareerRecommendation[]>([]);
  const [currentRecIndex, setCurrentRecIndex] = useState(-1);
  
  // Detail View States
  const [activeTab, setActiveTab] = useState<'skills' | 'interview'>('skills');
  const [skillsData, setSkillsData] = useState<{technical: SkillDetail[], soft: SkillDetail[]} | null>(null);
  const [interviewData, setInterviewData] = useState<InterviewQuestion[] | null>(null);
  const [roadmapData, setRoadmapData] = useState<RoadmapStep[] | null>(null);
  
  // Loading States for Details
  const [skillLoading, setSkillLoading] = useState(false);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [roadmapLoading, setRoadmapLoading] = useState(false);

  // New Modals State
  const [showConsultModal, setShowConsultModal] = useState(false);
  const [consultStatus, setConsultStatus] = useState<'idle' | 'loading' | 'success'>('idle');
  const [selectedSkill, setSelectedSkill] = useState<SkillDetail | null>(null);
  const [showRoadmapView, setShowRoadmapView] = useState(false); // Toggle between details and roadmap

  // Errors
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Refs for scrolling
  const detailsTopRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const handleInputChange = (field: keyof AdvancedFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if(errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const toggleSelection = (field: 'interests' | 'strengths' | 'environment', value: string, limit: number) => {
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(item => item !== value) };
      } else {
        if (current.length >= limit) return prev;
        return { ...prev, [field]: [...current, value] };
      }
    });
    if(errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = () => {
    const newErrors: {[key: string]: string} = {};
    let isValid = true;

    if (currentStep === 0) {
      if (!formData.name.trim()) newErrors.name = 'Please enter your name.';
      if ((formData.classLevel === '11th' || formData.classLevel === '12th' || formData.classLevel === 'Undergraduate') && !formData.stream.trim()) {
          newErrors.stream = 'Please enter your stream.';
      }
      if (!formData.marks) newErrors.marks = 'Please enter your marks.';
    } else if (currentStep === 1) {
      if (formData.interests.length === 0) newErrors.interests = 'Please select at least one interest.';
    } else if (currentStep === 2) {
      if (formData.strengths.length === 0) newErrors.strengths = 'Please select at least one strength.';
      if (formData.environment.length === 0) newErrors.environment = 'Please select at least one environment.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      isValid = false;
    }
    return isValid;
  };

  const nextStep = () => {
    if (validateStep()) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => setCurrentStep(prev => prev - 1);

  const fetchRecommendations = async (goal: string) => {
    setFormData(prev => ({ ...prev, goal }));
    setCurrentStep(4); // Move to results view placeholder
    setLoading(true);
    setLoadingText("JurniQ AI is analyzing your profile...");

    try {
      const recs = await generateAdvancedRecommendations({ ...formData, goal });
      setRecommendations(recs);

      // Fetch images in background
      recs.forEach(async (rec, index) => {
        const img = await generateImage(rec.imageTag);
        if (img) {
          setRecommendations(prev => {
            const newRecs = [...prev];
            newRecs[index].imageUrl = img;
            return newRecs;
          });
        }
      });
    } catch (error) {
      console.error(error);
      alert("Failed to generate recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRecClick = (index: number) => {
    setCurrentRecIndex(index);
    setShowRoadmapView(false);
    setSkillsData(null);
    setInterviewData(null);
    setRoadmapData(null);
    setActiveTab('skills');
    
    // Pre-fetch skills
    loadSkills(index);
    
    // Scroll to top of details
    setTimeout(() => {
        if (detailsTopRef.current) {
            detailsTopRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, 100);
  };

  const loadSkills = async (index: number) => {
    setSkillLoading(true);
    const rec = recommendations[index];
    try {
        const data = await generateSkillDetails(rec.title);
        setSkillsData(data);
    } catch (e) { console.error(e); }
    finally { setSkillLoading(false); }
  };

  const loadInterview = async () => {
    if(interviewData) return;
    setInterviewLoading(true);
    const rec = recommendations[currentRecIndex];
    try {
        const data = await generateInterviewQuestions(rec.title);
        setInterviewData(data);
    } catch (e) { console.error(e); }
    finally { setInterviewLoading(false); }
  };

  const loadRoadmap = async () => {
      setShowRoadmapView(true);
      if (roadmapData) return;
      
      setRoadmapLoading(true);
      const rec = recommendations[currentRecIndex];
      try {
          const data = await generateRoadmap(rec.title);
          setRoadmapData(data);
      } catch (e) { console.error(e); }
      finally { setRoadmapLoading(false); }
  };

  const resetFlow = () => {
      setView('start');
      setCurrentStep(0);
      setRecommendations([]);
      setCurrentRecIndex(-1);
      setFormData(prev => ({ ...prev, goal: '' }));
  };

  const handleConsultSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setConsultStatus('loading');
      
      const form = e.currentTarget;
      const name = (form.elements[0] as HTMLInputElement).value;
      const email = (form.elements[1] as HTMLInputElement).value;

      const rec = recommendations[currentRecIndex];
      
      try {
          const response = await fetch(API.sendConsultationEmail, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  name,
                  email,
                  recommendationTitle: rec?.title,
                  recommendationDescription: rec?.description,
                  skills: skillsData ? [...skillsData.technical, ...skillsData.soft] : null,
                  interviewQuestions: interviewData
              })
          });

          if (response.ok) {
              setConsultStatus('success');
          } else {
              alert("Failed to send request. Please try again.");
              setConsultStatus('idle');
          }
      } catch (error) {
          console.error(error);
          alert("Failed to send request. Please try again.");
          setConsultStatus('idle');
      }
  };

  // --- Subcomponents ---
  
  const CheckboxOption: React.FC<{ label: string; field: 'interests' | 'strengths' | 'environment'; limit: number }> = ({ label, field, limit }) => {
    const isSelected = formData[field].includes(label);
    const isLimitReached = formData[field].length >= limit;
    const isDisabled = !isSelected && isLimitReached;

    return (
        <label className={`flex items-center space-x-3 cursor-pointer group p-2 rounded-lg transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors flex-shrink-0 ${isSelected ? 'bg-primary-blue border-primary-blue' : 'border-gray-400 bg-white group-hover:border-primary-blue'}`}>
                {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>}
            </div>
            <input 
                type="checkbox" 
                className="hidden" 
                checked={isSelected} 
                disabled={isDisabled}
                onChange={() => toggleSelection(field, label, limit)} 
            />
            <span className={`text-sm md:text-base ${isSelected ? 'text-primary-blue font-medium' : 'text-gray-700'}`}>{label}</span>
        </label>
    );
  };

  // --- Icons for Roadmap ---
  const getMilestoneIcon = (index: number) => {
      const icons = [
          <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20v2H6.5A2.5 2.5 0 0 1 4 19.5v0Z"/><path d="M4 5A2.5 2.5 0 0 1 6.5 3H20v2H6.5A2.5 2.5 0 0 1 4 5v0Z"/><path d="M12 3v18"/></>,
          <><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></>,
          <><path d="M12 16.5V9.5m0 0L10 12m2-2.5 2 2.5"/><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2z"/></>,
          <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6"/><path d="M23 11h-6"/></>,
          <><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></>,
          <><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.5a6 6 0 0 0-4 6V22h8v-1.5a6 6 0 0 0-4-6Z"/><path d="M15 22v-1.5a4 4 0 0 0-4-4h-1"/><circle cx="12" cy="5" r="2"/></>
      ];
      return icons[index % icons.length];
  };

  // --- Render ---

  if (view === 'start') {
    return (
      <div className="relative min-h-screen flex items-center justify-center p-4 bg-gray-100 font-sans" style={{ backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fcomp_job_and_study.jpg?alt=media&token=434a1ce1-78ec-47b1-8392-9e1961c632b5')", backgroundSize: 'cover', backgroundAttachment: 'scroll', backgroundPosition: 'center' }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"></div>
        <div className="relative z-10 text-center animate-fade-in-up">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 drop-shadow-2xl">Discover Your True Path</h1>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto font-medium drop-shadow-md">
                Personalised AI 'JurniQ AI' powered career guidance tailored specifically to your unique profile, strengths, and interests.
            </p>
            <button 
              onClick={() => {
                  if(!user) { onRequireAuth(); return; }
                  setView('modal');
              }}
              className="bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white font-bold py-4 px-12 rounded-xl shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all text-lg tracking-wide active:translate-y-0 active:shadow-md"
            >
              Get Career Advice
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-hidden font-sans">
      <div className="bg-white/95 backdrop-blur-xl border border-gray-200/50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col relative transition-all duration-300">
        
        {/* Header */}
        <div className="pt-5 pb-3 px-6 flex justify-between items-center bg-transparent border-b border-gray-100 relative shrink-0">
            <h2 className="text-base font-bold text-gray-800 w-full text-center tracking-tight">
                {currentRecIndex === -1 ? 'Your Path to Success' : recommendations[currentRecIndex]?.title}
            </h2>
            <button onClick={resetFlow} className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
        </div>

        {/* Progress Bar */}
        {currentRecIndex === -1 && !loading && currentStep < 4 && (
             <div className="px-6 mt-4 mb-2 shrink-0">
                 <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500 ease-out rounded-full" style={{ width: `${((currentStep + 1) / 4) * 100}%` }}></div>
                 </div>
             </div>
        )}

        {/* Content Body */}
        <div className="flex-1 px-6 md:px-8 py-6 overflow-y-auto custom-scrollbar relative">
            
            {/* STEP 0: Basics */}
            {currentStep === 0 && (
                <div className="animate-fade-in-up space-y-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Let's start with the basics.</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                            <input 
                                value={formData.name} 
                                onChange={e => handleInputChange('name', e.target.value)} 
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                        </div>
                        
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Class/Grade</label>
                            <div className="relative">
                                <select 
                                    value={formData.classLevel} 
                                    onChange={e => handleInputChange('classLevel', e.target.value)} 
                                    className="w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white appearance-none cursor-pointer"
                                >
                                    <option>8th</option>
                                    <option>9th</option>
                                    <option>10th</option>
                                    <option>11th</option>
                                    <option>12th</option>
                                    <option>Undergraduate</option>
                                    <option>Graduate</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-700">
                                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Stream/Field of Study</label>
                            <input 
                                value={formData.stream} 
                                onChange={e => handleInputChange('stream', e.target.value)} 
                                placeholder="e.g., Science, Commerce, Arts" 
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder-gray-400" 
                            />
                            {errors.stream && <p className="text-red-500 text-xs mt-1">{errors.stream}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Previous Marks/GPA (%)</label>
                            <input 
                                type="number" 
                                value={formData.marks} 
                                onChange={e => handleInputChange('marks', e.target.value)} 
                                className="w-full border border-gray-300 rounded-lg shadow-sm py-2.5 px-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                            />
                            {errors.marks && <p className="text-red-500 text-xs mt-1">{errors.marks}</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 1: Interests */}
            {currentStep === 1 && (
                <div className="animate-fade-in-up">
                    <h3 className="text-lg font-bold text-gray-800 mb-2">Academic Preferences</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">What are your interests? <span className="font-normal text-xs text-gray-500">(choose up to 3)</span></label>
                            <p className="text-xs text-gray-500 mb-3">{formData.interests.length}/3 selected</p>
                            {errors.interests && <p className="text-red-500 text-xs mb-3">{errors.interests}</p>}
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {['Technology', 'Science', 'Arts', 'Literature', 'Mathematics', 'Social Sciences', 'Business', 'Healthcare', 'Engineering', 'Design', 'Environment', 'Sports'].map(item => (
                                    <CheckboxOption key={item} label={item} field="interests" limit={3} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: Preferences */}
            {currentStep === 2 && (
                <div className="animate-fade-in-up">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Personal Preferences</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">What are your key strengths? <span className="font-normal text-xs text-gray-500">(choose up to 3)</span></label>
                            <p className="text-xs text-gray-500 mb-3">{formData.strengths.length}/3 selected</p>
                            {errors.strengths && <p className="text-red-500 text-xs mb-3">{errors.strengths}</p>}
                            
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {['Problem Solving', 'Creativity', 'Communication', 'Leadership', 'Analytical Thinking', 'Technical Skills', 'Teamwork', 'Attention to Detail', 'Critical Thinking', 'Organization'].map(item => (
                                    <CheckboxOption key={item} label={item} field="strengths" limit={3} />
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Preferred work environment <span className="font-normal text-xs text-gray-500">(choose up to 2)</span></label>
                            <p className="text-xs text-gray-500 mb-3">{formData.environment.length}/2 selected</p>
                            {errors.environment && <p className="text-red-500 text-xs mb-3">{errors.environment}</p>}
                            
                            <div className="grid grid-cols-2 gap-3">
                                {['Office/Corporate', 'Remote/Work', 'Field Work', 'Laboratory', 'Creative Studio', 'Classroom'].map(item => (
                                    <CheckboxOption key={item} label={item} field="environment" limit={2} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3: Goal Selection */}
            {currentStep === 3 && (
                <div className="animate-fade-in-up h-full flex flex-col justify-center">
                     <h3 className="text-xl font-bold text-center text-gray-800 mb-2">Choose Your Path</h3>
                     <p className="text-center text-gray-500 text-sm mb-8">What would you like to explore next?</p>
                     
                     <div className="grid md:grid-cols-2 gap-6">
                         <div 
                            onClick={() => fetchRecommendations('Job')}
                            className="group relative h-72 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                         >
                             <img src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fworking-women.jpg?alt=media&token=ea4e5f64-ca4d-454c-8d14-e0756a84aad1" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Job" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                                 <h4 className="text-lg font-bold text-white mb-1">Jobs & Careers</h4>
                                 <p className="text-gray-300 text-xs leading-relaxed">Discover job opportunities matching your profile.</p>
                                 <button className="mt-4 bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white text-sm font-semibold py-2 px-4 rounded-lg w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">Get Path</button>
                             </div>
                         </div>
                         <div 
                            onClick={() => fetchRecommendations('Higher Studies')}
                            className="group relative h-72 rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
                         >
                             <img src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fgraduation_background_squre.jpg?alt=media&token=95c7ef17-4f2e-48c3-806c-49d62974026b" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Studies" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-6">
                                 <h4 className="text-lg font-bold text-white mb-1">Higher Studies</h4>
                                 <p className="text-gray-300 text-xs leading-relaxed">Explore educational pathways and degrees.</p>
                                 <button className="mt-4 bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white text-sm font-semibold py-2 px-4 rounded-lg w-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">Get Path</button>
                             </div>
                         </div>
                     </div>
                </div>
            )}

            {/* STEP 4: Loading & Results */}
            {currentStep === 4 && (
                <div className="h-full">
                    {loading ? (
                        <div className="h-full flex flex-col items-center justify-center">
                             <div className="w-14 h-14 border-4 border-gray-200 border-t-[#42B4FF] rounded-full animate-spin mb-4"></div>
                             <p className="text-base font-semibold text-gray-600">{loadingText}</p>
                             <p className="text-xs text-gray-400 mt-1">This might take a moment.</p>
                        </div>
                    ) : (
                        currentRecIndex === -1 ? (
                            // List View
                            <div className="animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold text-gray-800">Here Are Your Top Recommendations!</h3>
                                    <button 
                                        onClick={() => setCurrentStep(3)}
                                        className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-lg transition-colors"
                                    >
                                        Change Path
                                    </button>
                                </div>
                                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {recommendations.map((rec, idx) => (
                                        <div key={idx} className="bg-white rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col overflow-hidden group border border-gray-100">
                                            <div className="h-40 bg-gray-100 relative overflow-hidden">
                                                {rec.imageUrl ? (
                                                    <img src={rec.imageUrl} className="w-full h-full object-cover" alt={rec.title} />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400"><div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div></div>
                                                )}
                                            </div>
                                            <div className="p-4 flex flex-col flex-1">
                                                <h4 className="font-bold text-base text-gray-800 mb-1">{rec.title}</h4>
                                                <button onClick={() => handleRecClick(idx)} className="mt-auto w-full bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:shadow-lg transition-all text-sm">View</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            showRoadmapView ? (
                                // Roadmap View
                                <div className="animate-fade-in-up h-full flex flex-col">
                                    <button onClick={() => setShowRoadmapView(false)} className="self-start text-xs font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded-lg transition-all mb-4">
                                        &larr; Back to Details
                                    </button>
                                    <div className="bg-gray-50/80 p-6 rounded-lg border border-gray-100 flex-1 overflow-y-auto">
                                        <h3 className="text-lg font-bold text-gray-800 mb-1">Roadmap: <span className="text-indigo-600">{recommendations[currentRecIndex].title}</span></h3>
                                        <div className="mt-6 space-y-0">
                                            {roadmapLoading ? (
                                                <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin"></div></div>
                                            ) : roadmapData?.map((step, idx) => {
                                                const isLast = idx === roadmapData.length - 1;
                                                return (
                                                    <div key={idx} className="flex items-start">
                                                        <div className="flex flex-col items-center mr-6">
                                                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 text-white flex items-center justify-center shrink-0 z-10 shadow-md">
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    {getMilestoneIcon(idx)}
                                                                </svg>
                                                            </div>
                                                            {!isLast && <div className="w-1 flex-grow bg-indigo-100 min-h-[4rem]"></div>}
                                                        </div>
                                                        <div className="bg-white p-5 rounded-xl border border-gray-200/80 w-full mb-6 relative shadow-sm hover:shadow-md transition-shadow -top-2">
                                                            <div className="absolute -left-2 top-4 w-4 h-4 bg-white transform rotate-45 border-l border-b border-gray-200/80"></div>
                                                            <h4 className="font-bold text-gray-900 text-sm">{step.title}</h4>
                                                            <p className="text-xs font-semibold text-indigo-600 mt-1 mb-2">{step.duration}</p>
                                                            <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                // Detail View
                                <div className="animate-fade-in-up h-full flex flex-col" ref={detailsTopRef}>
                                    <button onClick={() => setCurrentRecIndex(-1)} className="self-start text-xs font-bold text-gray-700 bg-gray-200 hover:bg-gray-300 py-2 px-4 rounded-lg transition-all mb-4">
                                        &larr; Back to Recommendations
                                    </button>
                                    
                                    <div className="bg-gray-50/80 p-6 rounded-lg border border-gray-100 mb-6">
                                        <h3 className="text-lg font-bold text-gray-800 mb-2">What is {recommendations[currentRecIndex].title}?</h3>
                                        <p className="text-gray-600 text-sm leading-relaxed mb-6">{recommendations[currentRecIndex].description}</p>
                                        
                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <button 
                                                onClick={loadRoadmap}
                                                className="flex-1 bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m16 14-4-4-4 4"/></svg>
                                                Roadmap
                                            </button>
                                            <button 
                                                onClick={() => setShowConsultModal(true)}
                                                className="flex-1 bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white font-semibold py-2.5 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                                                Get Free Consultation
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tabs */}
                                    <div className="bg-gray-200/80 p-1 rounded-xl mb-4">
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => { setActiveTab('skills'); }} 
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'skills' ? 'bg-white text-primary-blue shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                                            >
                                                Key Skills
                                            </button>
                                            <button 
                                                onClick={() => { setActiveTab('interview'); loadInterview(); }} 
                                                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${activeTab === 'interview' ? 'bg-white text-primary-blue shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
                                            >
                                                Interview Prep
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tab Content */}
                                    <div className="flex-1 overflow-y-auto pr-1 pb-4">
                                        {activeTab === 'skills' && (
                                            skillLoading || !skillsData ? (
                                                <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#42B4FF] rounded-full animate-spin"></div></div>
                                            ) : (
                                                <div className="space-y-6">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                                                            Technical Skills
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {skillsData.technical.map((skill, i) => (
                                                                <button 
                                                                    key={i} 
                                                                    onClick={() => setSelectedSkill(skill)}
                                                                    className="bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                                                                >
                                                                    {skill.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                                                            Soft Skills
                                                        </h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {skillsData.soft.map((skill, i) => (
                                                                <button 
                                                                    key={i} 
                                                                    onClick={() => setSelectedSkill(skill)}
                                                                    className="bg-green-100 text-green-800 px-3 py-1.5 rounded-full text-xs font-medium hover:bg-green-200 transition-colors cursor-pointer"
                                                                >
                                                                    {skill.name}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        )}

                                        {activeTab === 'interview' && (
                                            interviewLoading || !interviewData ? (
                                                <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#42B4FF] rounded-full animate-spin"></div></div>
                                            ) : (
                                                <div className="space-y-3">
                                                    {interviewData.map((q, i) => (
                                                        <div key={i} className="border border-gray-200/90 rounded-xl overflow-hidden">
                                                            <details className="group">
                                                                <summary className="flex justify-between items-center font-medium cursor-pointer list-none bg-gray-100/70 hover:bg-gray-200/70 p-4 transition-colors">
                                                                    <span className="text-gray-800 text-sm font-semibold pr-4">{q.question}</span>
                                                                    <span className="transition-transform group-open:rotate-180 text-gray-500">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                                                    </span>
                                                                </summary>
                                                                <div className="text-gray-600 text-xs p-4 bg-white border-t border-gray-100 leading-relaxed">
                                                                    <strong className="block mb-1 text-gray-800">Answer Guidance:</strong>
                                                                    {q.answer_explanation}
                                                                </div>
                                                            </details>
                                                        </div>
                                                    ))}
                                                    <div className="mt-6 text-center">
                                                        <button 
                                                            onClick={() => setShowConsultModal(true)}
                                                            className="bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all text-sm transform hover:-translate-y-0.5"
                                                        >
                                                            Book 1-on-1 Interview Training
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )
                        )
                    )}
                </div>
            )}
        </div>

        {/* Footer Navigation (Steps 0-3) */}
        {currentRecIndex === -1 && !loading && currentStep < 4 && (
            <div className="p-5 border-t border-gray-200/80 bg-white flex justify-between items-center shrink-0">
                <button 
                    onClick={currentStep === 0 ? () => setView('start') : prevStep}
                    className="bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                    Back
                </button>
                <button 
                    onClick={nextStep}
                    className="bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white font-bold py-2 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all text-sm"
                >
                    Next
                </button>
            </div>
        )}
        
        {/* Footer Final (Restart) */}
        {currentStep === 4 && !loading && !showRoadmapView && currentRecIndex !== -1 && (
             <div className="hidden"></div> /* No footer needed in details view as per design, handled internally */
        )}
      </div>

      {/* --- CONSULTATION MODAL --- */}
      {showConsultModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full relative animate-bounce-in">
                  {consultStatus === 'idle' || consultStatus === 'loading' ? (
                      <>
                        <h3 className="text-xl font-bold mb-4 text-center text-gray-800">Get a Free Consultation</h3>
                        <p className="text-gray-600 mb-6 text-sm text-center">Fill out the form below and one of our expert counselors will be in touch shortly.</p>
                        <form onSubmit={handleConsultSubmit}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                                    <input required defaultValue={formData.name} disabled={consultStatus === 'loading'} className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-primary-blue outline-none disabled:opacity-50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">Email Address</label>
                                    <input type="email" required defaultValue={user?.email || ''} disabled={consultStatus === 'loading'} className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm focus:ring-2 focus:ring-primary-blue outline-none disabled:opacity-50" />
                                </div>
                            </div>
                            <div className="mt-8 flex gap-4">
                                <button type="button" onClick={() => setShowConsultModal(false)} disabled={consultStatus === 'loading'} className="flex-1 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 text-sm disabled:opacity-50">Cancel</button>
                                <button type="submit" disabled={consultStatus === 'loading'} className="flex-1 bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center disabled:opacity-50">
                                    {consultStatus === 'loading' ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : (
                                        'Submit'
                                    )}
                                </button>
                            </div>
                        </form>
                      </>
                  ) : (
                      <div className="text-center">
                          <div className="mx-auto w-12 h-12 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4 text-xl"><i className="fas fa-check"></i></div>
                          <h3 className="text-xl font-bold mb-2 text-green-600">Thank You!</h3>
                          <p className="text-gray-600 mb-6 text-sm">Your request has been received. We will be in touch soon!</p>
                          <button onClick={() => { setShowConsultModal(false); setConsultStatus('idle'); }} className="bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white font-bold py-2 px-8 rounded-lg text-sm">OK</button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* --- SKILL EXPLANATION MODAL --- */}
      {selectedSkill && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full relative animate-bounce-in">
                  <h3 className="text-lg font-bold mb-4 text-gray-800">What is {selectedSkill.name}?</h3>
                  <p className="text-gray-600 mb-6 text-sm leading-relaxed">{selectedSkill.explanation}</p>
                  <p className="text-gray-800 font-semibold mb-4 text-sm">Would you like to find a course for this skill?</p>
                  <div className="flex gap-4">
                       <button onClick={() => setSelectedSkill(null)} className="flex-1 bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 text-sm">No, thanks</button>
                       <button 
                          onClick={() => {
                              window.open(`https://www.google.com/search?q=online+course+for+${encodeURIComponent(selectedSkill.name)}`, '_blank');
                              setSelectedSkill(null);
                          }}
                          className="flex-1 bg-gradient-to-r from-[#42B4FF] to-[#007BFF] text-white font-bold py-2 px-4 rounded-lg text-sm"
                       >
                          Yes, let's go!
                       </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default CareerPath;

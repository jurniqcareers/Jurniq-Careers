
import React, { useState } from 'react';
import { User, CareerRecommendation, CareerDetails, RoadmapStep, Job, CareerFormData } from '../types';
import { generateRecommendations, generateCareerDetails, generateRoadmap, generateJobs, generateImage } from '../services/geminiService';
import { API } from '@/services/apiConfig';

interface CareerFormProps {
  user: User | null;
  onRequireAuth: () => void;
}

type Step = 'input' | 'recommendations' | 'details' | 'roadmap' | 'jobs';

const CareerForm: React.FC<CareerFormProps> = ({ user, onRequireAuth }) => {
  const [step, setStep] = useState<Step>('input');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CareerFormData>({
    fullName: user?.displayName || '',
    classLevel: '',
    stream: '',
    marks: 50
  });

  const [recommendations, setRecommendations] = useState<CareerRecommendation[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<CareerDetails | null>(null);
  const [careerTitle, setCareerTitle] = useState<string>('');
  const [roadmap, setRoadmap] = useState<RoadmapStep[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [images, setImages] = useState<{[key: string]: string}>({});
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  
  // Job Inquiry Form State
  const [contactMode, setContactMode] = useState(false);
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const recs = await generateRecommendations(formData.classLevel, formData.stream, formData.marks);
      setRecommendations(recs);
      
      // Fetch images in parallel
      const imageMap: {[key: string]: string} = {};
      await Promise.all(recs.map(async (rec) => {
          const imgUrl = await generateImage(rec.imageTag);
          if (imgUrl) imageMap[rec.title] = imgUrl;
      }));
      setImages(imageMap);

      setStep('recommendations');
    } catch (error) {
      console.error(error);
      alert("Failed to generate recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCareerSelect = async (title: string) => {
    if (!user) {
      onRequireAuth();
      return;
    }
    setLoading(true);
    setCareerTitle(title);
    try {
      const details = await generateCareerDetails(title);
      setSelectedCareer(details);
      setStep('details');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewRoadmap = async () => {
    setLoading(true);
    try {
      const data = await generateRoadmap(careerTitle);
      setRoadmap(data);
      setStep('roadmap');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewJobs = async () => {
    setLoading(true);
    try {
      const data = await generateJobs(careerTitle);
      setJobs(data);
      setStep('jobs');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setContactStatus('sending');
      const form = e.currentTarget;
      const data = new FormData(form);
      
      try {
          const response = await fetch(API.sendContactEmail, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  firstName: data.get('name'),
                  email: data.get('email'),
                  message: data.get('message')
              })
          });
          
          if(response.ok) {
              setContactStatus('success');
          } else {
              setContactStatus('error');
          }
      } catch (e) {
          console.error(e);
          setContactStatus('error');
      }
  };

  // --- RENDER HELPERS ---

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
            <div className="loader !w-12 !h-12 !border-4 mx-auto mb-4"></div>
            <p className="text-xl font-medium text-gray-600">Personalised AI 'JurniQ AI' is thinking...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="py-20 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-6">
        <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">
           {step === 'input' && "Recommendation for Career Path"}
           {step === 'recommendations' && "Recommended Career Paths"}
           {step === 'details' && `${careerTitle} Details`}
           {step === 'roadmap' && `${careerTitle} Roadmap`}
           {step === 'jobs' && `Job Opportunities for ${careerTitle}`}
        </h2>

        {/* INPUT FORM */}
        {step === 'input' && (
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl mx-auto transition-all">
            <h3 className="text-2xl font-semibold text-center text-gray-800 mb-6">Basic Information</h3>
            <p className="text-center text-gray-600 mb-8">Please provide your details to help us personalize your career recommendations.</p>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-gray-700 font-medium mb-2">Full Name <span className="text-red-500">*</span></label>
                <input required type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} placeholder="Enter your name" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900" />
              </div>
              <div>
                <label className="block text-gray-700 font-medium mb-2">Class <span className="text-red-500">*</span></label>
                <select required name="classLevel" value={formData.classLevel} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900">
                  <option value="">Select Class</option>
                  <option value="class-8">Class 8</option>
                  <option value="class-9">Class 9</option>
                  <option value="class-10">Class 10</option>
                  <option value="class-11">Class 11</option>
                  <option value="class-12">Class 12</option>
                  <option value="undergraduate">UnderGraduate</option>
                  <option value="postgraduate">PostGraduate</option>
                </select>
              </div>
              {['class-11', 'class-12', 'undergraduate', 'postgraduate'].includes(formData.classLevel) && (
                <div>
                  <label className="block text-gray-700 font-medium mb-2">Stream <span className="text-red-500">*</span></label>
                  <select required name="stream" value={formData.stream} onChange={handleInputChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-blue bg-white text-gray-900">
                    <option value="">Select Stream</option>
                    <option value="science">Science</option>
                    <option value="commerce">Commerce</option>
                    <option value="arts">Arts</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-gray-700 font-medium mb-2">Marks Percentage: {formData.marks}%</label>
                <input type="range" name="marks" min="40" max="100" value={formData.marks} onChange={handleInputChange} className="w-full h-2 bg-primary-blue rounded-lg appearance-none cursor-pointer" />
                <div className="flex justify-between text-sm text-gray-600 mt-2"><span>40%</span><span>100%</span></div>
              </div>
              <div className="text-center">
                <button type="submit" className="bg-primary-blue text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors w-full sm:w-auto h-12">Next</button>
              </div>
            </form>
          </div>
        )}

        {/* RECOMMENDATIONS GRID */}
        {step === 'recommendations' && (
          <>
             <button onClick={() => setStep('input')} className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Back</button>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="group relative overflow-hidden rounded-xl shadow-lg cursor-pointer transform transition-transform duration-300 hover:scale-105 bg-white">
                    <img 
                        src={images[rec.title] || `https://placehold.co/300x400/f0f9ff/333333?text=${rec.title}`} 
                        alt={rec.title} 
                        className="w-full h-64 object-cover transition-opacity duration-300 group-hover:opacity-75" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent"></div>
                    <div className="absolute bottom-0 p-4 w-full">
                      <h3 className="text-xl font-bold text-white mb-2">{rec.title}</h3>
                      <button onClick={() => handleCareerSelect(rec.title)} className="bg-primary-blue text-white px-6 py-2 rounded-full font-semibold text-sm transition-colors hover:bg-primary-dark">Get Started</button>
                    </div>
                  </div>
                ))}
             </div>
          </>
        )}

        {/* DETAILS VIEW */}
        {step === 'details' && selectedCareer && (
          <>
             <button onClick={() => setStep('recommendations')} className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Back to Recommendations</button>
             <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
                <div className="mb-10">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">What is {selectedCareer.title}?</h3>
                    <p className="text-gray-600 leading-relaxed">{selectedCareer.description}</p>
                </div>
                <div className="mb-10">
                    <h3 className="text-2xl font-bold text-gray-800 mb-4">Required Skills</h3>
                    <ul className="space-y-3">
                        {selectedCareer.skills.map((skill, i) => (
                            <li key={i} className="flex items-center text-gray-700">
                                <svg className="h-6 w-6 text-green-500 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {skill}
                            </li>
                        ))}
                    </ul>
                </div>
                {/* Placeholder Video */}
                <div className="mb-10">
                     <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-md bg-gray-900 flex items-center justify-center">
                         <img src={`https://placehold.co/1280x720/000000/FFFFFF?text=${selectedCareer.title}+Video`} className="w-full h-full object-cover opacity-50" alt="Video thumbnail" />
                         <div className="absolute">
                             <svg className="h-20 w-20 text-white opacity-80" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                         </div>
                     </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <button onClick={handleViewRoadmap} className="flex-1 bg-blue-100 text-primary-blue font-semibold py-3 px-6 rounded-lg hover:bg-blue-200 transition-colors flex items-center justify-center gap-2">Roadmap</button>
                    <button onClick={handleViewJobs} className="flex-1 bg-primary-blue text-white font-semibold py-3 px-6 rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2">View Job</button>
                </div>
             </div>
          </>
        )}

        {/* ROADMAP VIEW */}
        {step === 'roadmap' && (
             <>
             <button onClick={() => setStep('details')} className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Back to Details</button>
             <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
                 <div className="relative border-l-2 border-primary-blue pl-8">
                     {roadmap.map((step, idx) => (
                         <div key={idx} className="mb-10 ml-6 relative">
                             <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-[45px] ring-8 ring-white">
                                <svg className="w-5 h-5 text-primary-blue" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002 2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"></path></svg>
                             </span>
                             <h4 className="flex items-center mb-1 text-lg font-semibold text-gray-900">{step.title} <span className="bg-primary-blue text-white text-sm font-medium mr-2 px-2.5 py-0.5 rounded ml-3">{step.duration}</span></h4>
                             <p className="text-sm font-normal text-gray-600">{step.description}</p>
                         </div>
                     ))}
                 </div>
             </div>
             </>
        )}

        {/* JOBS VIEW */}
        {step === 'jobs' && (
            <>
            <button onClick={() => setStep('details')} className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">Back to Details</button>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {jobs.map((job, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-md p-6 cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all border border-gray-100">
                        <h4 className="text-lg font-bold text-gray-800">{job.jobTitle}</h4>
                        <p className="text-gray-600">{job.companyName}</p>
                        <button onClick={() => { setSelectedJob(job); setContactMode(false); setContactStatus('idle'); }} className="mt-4 text-sm text-primary-blue font-semibold hover:underline">View Details</button>
                    </div>
                ))}
            </div>
            
            {/* Job Modal */}
            {selectedJob && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedJob(null)}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 relative" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedJob(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800 text-3xl font-bold">&times;</button>
                        
                        {!contactMode ? (
                            <div className="text-center">
                                <h2 className="text-2xl font-bold mb-4">Job Details</h2>
                                <div className="mb-6">
                                    <h3 className="text-xl text-primary-blue font-semibold">{selectedJob.jobTitle}</h3>
                                    <p className="text-gray-600 font-medium">{selectedJob.companyName}</p>
                                </div>
                                <p className="text-gray-600 mb-6 text-sm">For more information about this position and to apply, please contact Jurniq Careers directly. We will guide you through the process.</p>
                                <button onClick={() => setContactMode(true)} className="w-full bg-primary-blue text-white py-3 px-6 rounded-lg font-semibold hover:bg-primary-dark transition-colors">
                                    Contact Us
                                </button>
                            </div>
                        ) : (
                            <div className="text-left">
                                {contactStatus === 'success' ? (
                                    <div className="text-center py-8">
                                        <div className="mx-auto w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4 text-2xl"><i className="fas fa-check"></i></div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">Message Sent!</h3>
                                        <p className="text-gray-600 text-sm">We have received your inquiry about the {selectedJob.jobTitle} position.</p>
                                        <button onClick={() => setSelectedJob(null)} className="mt-6 text-primary-blue font-semibold hover:underline">Close</button>
                                    </div>
                                ) : (
                                    <>
                                        <button onClick={() => setContactMode(false)} className="mb-4 text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"><i className="fas fa-arrow-left"></i> Back</button>
                                        <h2 className="text-xl font-bold mb-4">Inquire about {selectedJob.jobTitle}</h2>
                                        <form onSubmit={handleContactSubmit} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Your Name</label>
                                                <input name="name" required defaultValue={user?.displayName || formData.fullName} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-blue outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
                                                <input name="email" type="email" required defaultValue={user?.email || ''} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-blue outline-none" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Message</label>
                                                <textarea name="message" required rows={3} defaultValue={`I am interested in the ${selectedJob.jobTitle} position at ${selectedJob.companyName}. Please provide more details.`} className="w-full border rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-primary-blue outline-none"></textarea>
                                            </div>
                                            <button type="submit" disabled={contactStatus === 'sending'} className="w-full bg-primary-blue text-white py-3 rounded-lg font-bold hover:bg-primary-dark transition-colors disabled:opacity-70">
                                                {contactStatus === 'sending' ? 'Sending...' : 'Send Inquiry'}
                                            </button>
                                            {contactStatus === 'error' && <p className="text-xs text-red-500 text-center mt-2">Failed to send. Please try again.</p>}
                                        </form>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
            </>
        )}
      </div>
    </main>
  );
};

export default CareerForm;

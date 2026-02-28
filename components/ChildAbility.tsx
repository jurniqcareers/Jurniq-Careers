
import React, { useState } from 'react';
import { User } from '../types';
import { generateChildAptitudeTest, analyzeChildAptitude } from '../services/geminiService';

interface ChildAbilityProps {
  user: User | null;
  onRequireAuth: () => void;
  onBack: () => void;
}

const CAREER_DATA: any = {
    "Information Technology": {
        "Software Developer/Engineer": ["Frontend", "Backend", "Full-Stack", "Mobile App"],
        "Data Science": ["Data Scientist", "Machine Learning", "Analyst"],
        "Cybersecurity": ["Analyst", "Ethical Hacker", "Security Architect"],
    },
    "Healthcare": {
        "Doctor": ["Cardiology", "Neurology", "General", "Pediatrics"],
        "Nursing": ["Registered Nurse", "Critical Care"],
        "Pharmacy": ["Clinical", "Retail"]
    },
    "Engineering": {
        "Mechanical": ["Automotive", "Robotics", "HVAC"],
        "Civil": ["Structural", "Transportation", "Environmental"],
        "Electrical": ["Power Systems", "Electronics"]
    },
    "Business": {
        "Finance": ["Analyst", "Investment Banker", "Accountant"],
        "Marketing": ["Digital Marketing", "Brand Manager", "SEO"],
        "Management": ["HR", "Operations", "Project Management"]
    }
};

const ChildAbility: React.FC<ChildAbilityProps> = ({ user, onRequireAuth, onBack }) => {
  const [view, setView] = useState<'info' | 'choice' | 'specific' | 'test' | 'loading' | 'results'>('info');
  const [loadingText, setLoadingText] = useState('');
  
  const [childInfo, setChildInfo] = useState({ name: '', age: '', class: '' });
  const [testType, setTestType] = useState<'General' | 'Specific'>('General');
  const [specifics, setSpecifics] = useState({ sector: '', job: '', specialization: '' });
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  const [result, setResult] = useState<any>(null);

  // Handlers
  const handleInfoSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(!user) { onRequireAuth(); return; }
      setView('choice');
  };

  const startTest = async (type: 'General' | 'Specific') => {
      setTestType(type);
      if (type === 'Specific' && (!specifics.job || !specifics.specialization)) {
          alert("Please select a specific career path.");
          return;
      }
      
      setLoadingText(type === 'General' ? 'Crafting a General Aptitude test...' : `Creating a test for ${specifics.job}...`);
      setView('loading');

      const qData = await generateChildAptitudeTest(
          childInfo.class, 
          type, 
          type === 'Specific' ? `${specifics.job} (${specifics.specialization}) in ${specifics.sector}` : undefined
      );

      if (qData && qData.length > 0) {
          setQuestions(qData);
          setAnswers(new Array(qData.length).fill(''));
          setCurrentQIndex(0);
          setView('test');
      } else {
          alert("Failed to generate test. Please try again.");
          setView('choice');
      }
  };

  const handleAnswer = (val: string) => {
      const newAnswers = [...answers];
      newAnswers[currentQIndex] = val;
      setAnswers(newAnswers);
  };

  const submitTest = async () => {
      const confirm = window.confirm("Are you sure you want to submit?");
      if (!confirm) return;

      setLoadingText("Analyzing answers...");
      setView('loading');

      const formattedAnswers = questions.map((q, i) => ({ question: q.question, answer: answers[i] || "Not Answered" }));
      const analysis = await analyzeChildAptitude(
          formattedAnswers, 
          childInfo.class, 
          testType, 
          testType === 'Specific' ? `${specifics.job} (${specifics.specialization})` : undefined
      );

      if (analysis) {
          setResult(analysis);
          setView('results');
      } else {
          alert("Analysis failed.");
          setView('choice');
      }
  };

  // --- PDF ---
  const downloadPDF = async () => {
      if (!window.jspdf || !window.html2canvas) { alert("PDF libraries not loaded."); return; }
      
      const element = document.getElementById('pdf-content');
      if (!element) return;

      try {
          // Temporarily expand for capture
          const qaDiv = document.getElementById('qa-hidden');
          if(qaDiv) qaDiv.style.display = 'block';

          const canvas = await window.html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
          const imgData = canvas.toDataURL('image/png');
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfW = pdf.internal.pageSize.getWidth();
          const pdfH = pdf.internal.pageSize.getHeight();
          const imgProps = pdf.getImageProperties(imgData);
          const ratio = imgProps.height / imgProps.width;
          const h = pdfW * ratio;
          
          pdf.addImage(imgData, 'PNG', 0, 0, pdfW, h);
          pdf.save(`${childInfo.name}_Assessment.pdf`);

          if(qaDiv) qaDiv.style.display = 'none';
      } catch(e) { console.error(e); }
  };

  // --- Render ---

  if (view === 'loading') {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <div className="loader !w-12 !h-12 !border-4 mb-4"></div>
              <p className="text-xl font-semibold text-gray-700">{loadingText}</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans" style={{ backgroundImage: "url('https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fdashboard%2Fpexels-knownasovan-57690.jpg?alt=media&token=0fd7a6a5-92da-4b03-bded-37fea17239e2')", backgroundSize: 'cover', backgroundAttachment: 'fixed' }}>
        <div className="max-w-4xl mx-auto bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl overflow-hidden min-h-[600px] relative">
            <button onClick={onBack} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 z-10 text-lg font-bold">&times;</button>

            {view === 'info' && (
                <div className="p-10 flex flex-col items-center justify-center h-full text-center">
                    <img src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2FLOGO%201500px.png?alt=media&token=a4084b6f-58a5-479e-9d6f-72286272f01b" alt="Logo" className="h-12 mb-8" />
                    <h2 className="text-3xl font-bold text-gray-800 mb-2">Child Ability Test</h2>
                    <p className="text-gray-600 mb-8">Enter your child's details to begin the assessment.</p>
                    <form onSubmit={handleInfoSubmit} className="w-full max-w-sm space-y-4">
                        <input required placeholder="Child's Name" value={childInfo.name} onChange={e => setChildInfo({...childInfo, name: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        <input required type="number" placeholder="Age" value={childInfo.age} onChange={e => setChildInfo({...childInfo, age: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        <input required placeholder="Class (e.g. 8th, 10th)" value={childInfo.class} onChange={e => setChildInfo({...childInfo, class: e.target.value})} className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">Start Assessment</button>
                    </form>
                </div>
            )}

            {view === 'choice' && (
                <div className="p-10 text-center">
                    <h2 className="text-3xl font-bold text-gray-800 mb-8">Welcome, {childInfo.name}!</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div onClick={() => startTest('General')} className="bg-blue-50 p-8 rounded-xl cursor-pointer hover:shadow-lg hover:bg-blue-100 transition border border-blue-200">
                            <h3 className="text-xl font-bold text-blue-800 mb-2">General Aptitude</h3>
                            <p className="text-gray-600">Discover innate potential and receive generic career suggestions.</p>
                        </div>
                        <div onClick={() => setView('specific')} className="bg-green-50 p-8 rounded-xl cursor-pointer hover:shadow-lg hover:bg-green-100 transition border border-green-200">
                            <h3 className="text-xl font-bold text-green-800 mb-2">Specific Aptitude</h3>
                            <p className="text-gray-600">Check suitability for a specific career path or job role.</p>
                        </div>
                    </div>
                </div>
            )}

            {view === 'specific' && (
                <div className="p-10">
                    <button onClick={() => setView('choice')} className="text-gray-500 hover:text-blue-600 mb-6 flex items-center gap-2"><i className="fas fa-arrow-left"></i> Back</button>
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Select Career Path</h2>
                    <div className="space-y-4 max-w-md mx-auto">
                        <select className="w-full p-3 border rounded-lg" value={specifics.sector} onChange={e => setSpecifics({ sector: e.target.value, job: '', specialization: '' })}>
                            <option value="">Select Sector</option>
                            {Object.keys(CAREER_DATA).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select className="w-full p-3 border rounded-lg" disabled={!specifics.sector} value={specifics.job} onChange={e => setSpecifics({ ...specifics, job: e.target.value, specialization: '' })}>
                            <option value="">Select Job</option>
                            {specifics.sector && Object.keys(CAREER_DATA[specifics.sector]).map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                        <select className="w-full p-3 border rounded-lg" disabled={!specifics.job} value={specifics.specialization} onChange={e => setSpecifics({ ...specifics, specialization: e.target.value })}>
                            <option value="">Select Specialization</option>
                            {specifics.job && CAREER_DATA[specifics.sector][specifics.job].map((s: string) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <button onClick={() => startTest('Specific')} disabled={!specifics.specialization} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition">Start Test</button>
                    </div>
                </div>
            )}

            {view === 'test' && (
                <div className="flex h-full">
                    <div className="w-3/4 p-8 overflow-y-auto">
                        <div className="mb-6">
                            <span className="text-sm font-bold text-gray-400">Question {currentQIndex + 1} of {questions.length}</span>
                            <h3 className="text-xl font-bold text-gray-800 mt-2">{questions[currentQIndex].question}</h3>
                        </div>
                        {questions[currentQIndex].type === 'mcq' ? (
                            <div className="space-y-3">
                                {questions[currentQIndex].options.map((opt: string, i: number) => (
                                    <label key={i} className={`flex items-center p-4 border rounded-lg cursor-pointer transition ${answers[currentQIndex] === opt ? 'bg-blue-50 border-blue-500' : 'hover:bg-gray-50'}`}>
                                        <input type="radio" name={`q${currentQIndex}`} checked={answers[currentQIndex] === opt} onChange={() => handleAnswer(opt)} className="mr-3" />
                                        {opt}
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <textarea className="w-full h-32 p-3 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" placeholder="Type your answer here..." value={answers[currentQIndex]} onChange={e => handleAnswer(e.target.value)}></textarea>
                        )}
                        <div className="mt-8 flex justify-between">
                            <button disabled={currentQIndex === 0} onClick={() => setCurrentQIndex(curr => curr - 1)} className="px-6 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 disabled:opacity-50">Previous</button>
                            {currentQIndex < questions.length - 1 ? (
                                <button onClick={() => setCurrentQIndex(curr => curr + 1)} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Next</button>
                            ) : (
                                <button onClick={submitTest} className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Submit</button>
                            )}
                        </div>
                    </div>
                    <div className="w-1/4 bg-gray-50 border-l p-6 overflow-y-auto">
                        <h4 className="font-bold mb-4 text-center">Palette</h4>
                        <div className="grid grid-cols-4 gap-2">
                            {questions.map((_, i) => (
                                <button key={i} onClick={() => setCurrentQIndex(i)} className={`w-8 h-8 rounded text-xs font-bold ${i === currentQIndex ? 'bg-blue-600 text-white' : answers[i] ? 'bg-green-500 text-white' : 'bg-white border'}`}>
                                    {i + 1}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {view === 'results' && result && (
                <div className="p-8 h-full overflow-y-auto" id="pdf-content">
                    <div className="flex justify-between items-start mb-6 border-b pb-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Assessment Report</h2>
                            <p className="text-gray-500">JurniQ Career Guidance</p>
                        </div>
                        <img src="https://firebasestorage.googleapis.com/v0/b/jurniqcareers.firebasestorage.app/o/web_images%2Fhome%2FLOGO%201500px.png?alt=media&token=a4084b6f-58a5-479e-9d6f-72286272f01b" alt="Logo" className="h-8" />
                    </div>
                    
                    <div className="bg-blue-50 p-4 rounded-lg mb-6 grid grid-cols-2 gap-4 text-sm">
                        <p><strong>Name:</strong> {childInfo.name}</p>
                        <p><strong>Class:</strong> {childInfo.class}</p>
                        <p><strong>Test Type:</strong> {testType}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="mb-8">
                        {testType === 'General' ? (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Top Career Suggestions</h3>
                                <div className="space-y-4">
                                    {result.suggestions?.map((s: any, i: number) => (
                                        <div key={i} className="bg-white border p-4 rounded-lg shadow-sm">
                                            <h4 className="font-bold text-blue-700">{s.career}</h4>
                                            <p className="text-gray-600 text-sm mt-1">{s.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold text-gray-800 mb-4">Aptitude Analysis</h3>
                                <div className="bg-white border p-6 rounded-lg shadow-sm text-center mb-6">
                                    <p className="text-gray-600">Verdict</p>
                                    <p className="text-3xl font-extrabold text-blue-700 mt-2">{result.verdict}</p>
                                </div>
                                <div className="prose max-w-none text-gray-700">
                                    <p>{result.analysis}</p>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Hidden Q&A for PDF */}
                    <div id="qa-hidden" className="hidden mt-8 border-t pt-6">
                        <h3 className="font-bold mb-4">Questions & Answers</h3>
                        {questions.map((q, i) => (
                            <div key={i} className="mb-3 text-xs">
                                <p className="font-semibold">Q{i+1}: {q.question}</p>
                                <p className="text-gray-600">Ans: {answers[i] || 'Not Answered'}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-8 no-print">
                        <button onClick={downloadPDF} className="bg-red-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-600 mr-4">Download PDF</button>
                        <button onClick={() => setView('info')} className="bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Take Another Test</button>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default ChildAbility;


import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { analyzeBusinessIdea, getBusinessGuidance, generateBusinessQuiz, evaluateBusinessQuiz, getBusinessDeepDive } from '../services/geminiService';
import { db } from '../services/firebaseService';
import { doc, getDoc, updateDoc, setDoc, arrayUnion } from 'firebase/firestore';

interface BusinessProps {
  user: User | null;
  onRequireAuth: () => void;
  onBack: () => void;
}

declare global {
    interface Window {
        Chart: any;
        jspdf: any;
        html2canvas: any;
    }
}

const Business: React.FC<BusinessProps> = ({ user, onRequireAuth, onBack }) => {
  const [view, setView] = useState<'initial' | 'idea-input' | 'analysis' | 'guidance' | 'quiz' | 'quiz-results' | 'deep-dive'>('initial');
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  
  // Idea Flow State
  const [ideaForm, setIdeaForm] = useState({ idea: '', problem: '', solution: '' });
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [guidanceResult, setGuidanceResult] = useState<any>(null);
  
  // Quiz Flow State
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [userAnswers, setUserAnswers] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [suggestedIdeas, setSuggestedIdeas] = useState<any[]>([]);
  const [deepDiveContent, setDeepDiveContent] = useState<string>('');
  const [deepDiveTitle, setDeepDiveTitle] = useState<string>('');

  // Refs for Charts
  const marketChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const guidanceChartInstances = useRef<any[]>([]);

  // Check for deep link from Dashboard
  useEffect(() => {
      const savedIdeaStr = localStorage.getItem('jurniq_target_business_idea');
      if (savedIdeaStr) {
          try {
              const savedIdea = JSON.parse(savedIdeaStr);
              localStorage.removeItem('jurniq_target_business_idea');
              
              if (savedIdea.type === 'analysis') {
                  setAnalysisResult(savedIdea.data);
                  setView('analysis');
              } else if (savedIdea.type === 'deep-dive') {
                  setDeepDiveTitle(savedIdea.title);
                  setDeepDiveContent(savedIdea.data);
                  setView('deep-dive');
              }
          } catch (e) {
              console.error("Failed to parse saved idea", e);
          }
      }
  }, []);

  // --- Handlers ---

  const handleIdeaSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) { onRequireAuth(); return; }
      setLoading(true);
      setLoadingText("Personalised AI 'JurniQ AI' is analyzing your business idea...");
      
      const result = await analyzeBusinessIdea(ideaForm.idea, ideaForm.problem, ideaForm.solution);
      if (result) {
          setAnalysisResult(result);
          setView('analysis');
      } else {
          alert("Could not analyze idea. Please try again.");
      }
      setLoading(false);
  };

  const handleGetGuidance = async () => {
      setLoading(true);
      setLoadingText('Generating step-by-step guidance...');
      const result = await getBusinessGuidance(analysisResult.ideaTitle);
      if (result) {
          setGuidanceResult(result);
          setView('guidance');
      } else {
          alert("Could not generate guidance.");
      }
      setLoading(false);
  };

  const handleStartQuiz = async () => {
      if (!user) { onRequireAuth(); return; }
      setLoading(true);
      setLoadingText('Generating your aptitude quiz...');
      const result = await generateBusinessQuiz();
      if (result && result.questions) {
          setQuizQuestions(result.questions);
          setUserAnswers([]);
          setCurrentQIndex(0);
          setView('quiz');
      }
      setLoading(false);
  };

  const handleQuizAnswer = (option: string) => {
      const q = quizQuestions[currentQIndex];
      const newAnswers = [...userAnswers, { question: q.question, answer: option }];
      setUserAnswers(newAnswers);

      if (currentQIndex < quizQuestions.length - 1) {
          setCurrentQIndex(prev => prev + 1);
      } else {
          finishQuiz(newAnswers);
      }
  };

  const finishQuiz = async (answers: any[]) => {
      setLoading(true);
      setLoadingText('Analyzing your answers to find perfect business ideas...');
      const result = await evaluateBusinessQuiz(answers);
      if (result && result.ideas) {
          setSuggestedIdeas(result.ideas);
          setView('quiz-results');
      }
      setLoading(false);
  };

  const handleViewDeepDive = async (title: string) => {
      setLoading(true);
      setLoadingText('Generating deep research report...');
      setDeepDiveTitle(title);
      const html = await getBusinessDeepDive(title);
      setDeepDiveContent(html);
      setView('deep-dive');
      setLoading(false);
  };

  const handleSave = async (type: 'analysis' | 'deep-dive') => {
      if (!user) { onRequireAuth(); return; }
      
      let payload = {};
      if (type === 'analysis') {
          payload = {
              id: Date.now().toString(),
              type: 'analysis',
              title: analysisResult.ideaTitle,
              description: 'Business Analysis',
              data: analysisResult,
              savedAt: new Date().toISOString()
          };
      } else {
          payload = {
              id: Date.now().toString(),
              type: 'deep-dive',
              title: deepDiveTitle,
              description: 'Deep Dive Report',
              data: deepDiveContent,
              savedAt: new Date().toISOString()
          };
      }

      try {
          const userRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userRef);
          
          if (!docSnap.exists()) {
              await setDoc(userRef, { saved_business_ideas: [payload] }, { merge: true });
          } else {
              await updateDoc(userRef, {
                  saved_business_ideas: arrayUnion(payload)
              });
          }
          alert("Business Idea Saved to Dashboard!");
      } catch(e) {
          console.error(e);
          alert("Failed to save idea.");
      }
  };

  const downloadPDF = async (elementId: string, title: string) => {
      if (!window.jspdf || !window.html2canvas) {
          alert("PDF libraries not loaded. Please refresh.");
          return;
      }
      
      const element = document.getElementById(elementId);
      if(!element) return;

      // 1. Hide buttons before capture
      const noPrintElements = element.querySelectorAll('.no-print');
      noPrintElements.forEach((el: any) => el.style.display = 'none');

      // 2. Expand all details
      const details = element.querySelectorAll('details');
      details.forEach(d => d.setAttribute('open', 'true'));

      try {
          // 3. Capture Canvas
          const canvas = await window.html2canvas(element, { 
              scale: 2, 
              useCORS: true, 
              backgroundColor: '#ffffff',
              windowWidth: element.scrollWidth,
              windowHeight: element.scrollHeight
          });
          const imgData = canvas.toDataURL('image/png');
          
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
          const pdfWidth = doc.internal.pageSize.getWidth();
          const pdfHeight = doc.internal.pageSize.getHeight();
          
          const imgProps = doc.getImageProperties(imgData);
          const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
          
          // PDF Page Settings
          const marginTop = 60;
          const marginBottom = 40;
          const contentHeight = pdfHeight - marginTop - marginBottom;
          
          let heightLeft = imgHeight;
          let position = marginTop; // Start drawing below header
          let page = 1;

          // Helper: Add Branding (Watermark, Header, Footer)
          // IMPORTANT: Call this AFTER adding the image so text appears on top
          const addBranding = (pageNum: number) => {
              // Mask Header/Footer Areas with White Rectangles (covers image overflow)
              doc.setFillColor(255, 255, 255);
              doc.rect(0, 0, pdfWidth, marginTop, 'F'); // Top mask
              doc.rect(0, pdfHeight - marginBottom, pdfWidth, marginBottom, 'F'); // Bottom mask

              // Watermark
              if (doc.setGState) {
                  doc.setGState(new doc.GState({ opacity: 0.15 }));
                  doc.setFontSize(60);
                  doc.setTextColor(150, 150, 150);
                  doc.text("Jurniq Careers", pdfWidth / 2, pdfHeight / 2, { align: 'center', angle: 45 });
                  doc.setGState(new doc.GState({ opacity: 1 })); // Reset opacity
              }

              // Header Text
              doc.setFontSize(16);
              doc.setTextColor(40, 40, 40);
              doc.setFont("helvetica", "bold");
              doc.text(title, pdfWidth / 2, 40, { align: 'center' });
              
              // Footer Text
              doc.setFontSize(10);
              doc.setTextColor(100, 100, 100);
              doc.setFont("helvetica", "normal");
              doc.text(`Jurniq Business Research Report - Page ${pageNum}`, pdfWidth / 2, pdfHeight - 20, { align: 'center' });
          };

          // First Page
          doc.addImage(imgData, 'PNG', 0, marginTop, pdfWidth, imgHeight); 
          addBranding(page);
          
          heightLeft -= contentHeight;

          // Subsequent Pages
          while (heightLeft > 0) {
            position -= contentHeight; // Move image up
            doc.addPage();
            page++;
            // Draw image with negative vertical offset
            doc.addImage(imgData, 'PNG', 0, marginTop + ((page - 1) * -contentHeight), pdfWidth, imgHeight); 
            addBranding(page);
            heightLeft -= contentHeight;
          }
          
          doc.save(`Jurniq-Business-${title.replace(/\s+/g, '-')}.pdf`);

      } catch (e) {
          console.error("PDF Error", e);
          alert("Failed to generate PDF.");
      } finally {
          // 4. Restore UI state
          noPrintElements.forEach((el: any) => el.style.display = '');
          details.forEach(d => d.removeAttribute('open'));
      }
  };

  // --- Effects for Charts ---

  useEffect(() => {
      if (view === 'analysis' && analysisResult && marketChartRef.current && window.Chart) {
          if (chartInstanceRef.current) chartInstanceRef.current.destroy();
          
          const ctx = marketChartRef.current.getContext('2d');
          if (ctx) {
              chartInstanceRef.current = new window.Chart(ctx, {
                  type: 'line',
                  data: {
                      labels: analysisResult.marketAnalysis?.marketSizeData?.labels || [],
                      datasets: [{
                          label: 'Projected Market Size (USD Millions)',
                          data: analysisResult.marketAnalysis?.marketSizeData?.data || [],
                          backgroundColor: 'rgba(59, 176, 255, 0.2)',
                          borderColor: 'rgba(59, 176, 255, 1)',
                          borderWidth: 2,
                          tension: 0.3,
                          fill: true
                      }]
                  },
                  options: {
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: { y: { beginAtZero: true } }
                  }
              });
          }
      }
  }, [view, analysisResult]);

  useEffect(() => {
      if (view === 'guidance' && guidanceResult && window.Chart) {
          // Cleanup old charts
          guidanceChartInstances.current.forEach(c => c.destroy());
          guidanceChartInstances.current = [];

          // Wait for DOM
          setTimeout(() => {
              guidanceResult.phases.forEach((phase: any, index: number) => {
                  const canvas = document.getElementById(`budget-chart-${index}`) as HTMLCanvasElement;
                  if (canvas) {
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                          const newChart = new window.Chart(ctx, {
                              type: 'doughnut',
                              data: {
                                  labels: Object.keys(phase.budgetDistribution),
                                  datasets: [{
                                      data: Object.values(phase.budgetDistribution),
                                      backgroundColor: ['#3BB0FF', '#FF6384', '#FFCE56', '#4BC0C0'],
                                      borderWidth: 1
                                  }]
                              },
                              options: {
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } } }
                              }
                          });
                          guidanceChartInstances.current.push(newChart);
                      }
                  }
              });
          }, 100);
      }
  }, [view, guidanceResult]);


  // --- Render ---

  if (loading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
              <div className="loader !w-16 !h-16 !border-4 mb-6"></div>
              <p className="text-xl font-semibold text-gray-700">{loadingText}</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
            
            {/* Header */}
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Business <span className="text-primary-blue">Blaster</span></h1>
                <button onClick={onBack} className="text-gray-500 hover:text-gray-800 font-medium">Back to Dashboard</button>
            </div>

            {/* INITIAL CHOICE */}
            {view === 'initial' && (
                <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in-up">
                    <h2 className="text-4xl font-bold text-gray-800 mb-6">Do you have a business idea?</h2>
                    <p className="text-gray-600 mb-10 max-w-lg">Whether you have a solid plan or need a spark of inspiration, our Personalised AI 'JurniQ AI' tools can help you launch your dream business.</p>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <button 
                            onClick={() => setView('idea-input')}
                            className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-10 rounded-xl shadow-lg transform hover:-translate-y-1 transition-all text-lg"
                        >
                            Yes, I have an idea!
                        </button>
                        <button 
                            onClick={handleStartQuiz}
                            className="bg-primary-blue hover:bg-primary-dark text-white font-bold py-4 px-10 rounded-xl shadow-lg transform hover:-translate-y-1 transition-all text-lg"
                        >
                            No, inspire me.
                        </button>
                    </div>
                </div>
            )}

            {/* IDEA INPUT */}
            {view === 'idea-input' && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg animate-fade-in-up">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Describe Your Vision</h2>
                    <form onSubmit={handleIdeaSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Your Business Idea</label>
                            <textarea 
                                required rows={3} 
                                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-blue" 
                                placeholder="e.g. A subscription box for eco-friendly pet toys."
                                value={ideaForm.idea} onChange={e => setIdeaForm({...ideaForm, idea: e.target.value})}
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">The Problem You're Solving</label>
                            <textarea 
                                required rows={3} 
                                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-blue" 
                                placeholder="e.g. Pet owners struggle to find sustainable and durable toys."
                                value={ideaForm.problem} onChange={e => setIdeaForm({...ideaForm, problem: e.target.value})}
                            ></textarea>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Your Unique Solution</label>
                            <textarea 
                                required rows={3} 
                                className="w-full border rounded-lg p-3 outline-none focus:ring-2 focus:ring-primary-blue" 
                                placeholder="e.g. We source materials from certified recycled plastics."
                                value={ideaForm.solution} onChange={e => setIdeaForm({...ideaForm, solution: e.target.value})}
                            ></textarea>
                        </div>
                        <button type="submit" className="w-full bg-primary-blue text-white font-bold py-3 rounded-lg hover:bg-primary-dark transition-all shadow-md">
                            Analyze My Idea
                        </button>
                    </form>
                </div>
            )}

            {/* ANALYSIS RESULT */}
            {view === 'analysis' && analysisResult && (
                <div className="bg-white p-8 rounded-2xl shadow-lg animate-fade-in-up" id="analysis-content">
                    <div className="flex flex-col md:flex-row justify-between items-start mb-6 border-b pb-4 gap-4">
                        <h2 className="text-3xl font-bold text-gray-800">{analysisResult.ideaTitle}</h2>
                        <div className="flex gap-2 no-print">
                            <button onClick={() => setView('idea-input')} className="text-sm bg-gray-100 text-gray-600 px-4 py-2 rounded hover:bg-gray-200">Edit Idea</button>
                            <button onClick={() => handleSave('analysis')} className="text-sm bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-bold"><i className="fas fa-bookmark mr-1"></i> Save to Dashboard</button>
                            <button onClick={() => downloadPDF('analysis-content', analysisResult.ideaTitle)} className="text-sm bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-bold"><i className="fas fa-file-pdf mr-1"></i> PDF</button>
                        </div>
                    </div>
                    
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">Validation</h3>
                            <p className="text-gray-600 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-100">{analysisResult.ideaValidation}</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-700 mb-2">Market Analysis</h3>
                                <p className="text-gray-600 text-sm mb-4">{analysisResult.marketAnalysis?.summary}</p>
                                <div className="h-64 bg-gray-50 rounded-lg p-2 border border-gray-100">
                                    <canvas ref={marketChartRef}></canvas>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-700 mb-2">Target Audience</h3>
                                <div className="bg-green-50 p-6 rounded-lg border border-green-100">
                                    <h4 className="font-bold text-green-800 mb-1">{analysisResult.targetAudience?.personaName}</h4>
                                    <p className="text-sm text-green-700 mb-3">{analysisResult.targetAudience?.demographics}</p>
                                    <div className="space-y-2">
                                        <p className="text-xs font-bold uppercase text-green-600">Pain Points:</p>
                                        <ul className="list-disc list-inside text-sm text-gray-700">
                                            {analysisResult.targetAudience?.painPoints?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xl font-bold text-gray-700 mb-4">SWOT Analysis</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 bg-green-50 rounded-lg border border-green-200"><h4 className="font-bold text-green-700 mb-2">Strengths</h4><ul className="text-xs list-disc list-inside">{analysisResult.swotAnalysis?.strengths?.map((s:string, i:number) => <li key={i}>{s}</li>)}</ul></div>
                                <div className="p-4 bg-red-50 rounded-lg border border-red-200"><h4 className="font-bold text-red-700 mb-2">Weaknesses</h4><ul className="text-xs list-disc list-inside">{analysisResult.swotAnalysis?.weaknesses?.map((s:string, i:number) => <li key={i}>{s}</li>)}</ul></div>
                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200"><h4 className="font-bold text-blue-700 mb-2">Opportunities</h4><ul className="text-xs list-disc list-inside">{analysisResult.swotAnalysis?.opportunities?.map((s:string, i:number) => <li key={i}>{s}</li>)}</ul></div>
                                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200"><h4 className="font-bold text-orange-700 mb-2">Threats</h4><ul className="text-xs list-disc list-inside">{analysisResult.swotAnalysis?.threats?.map((s:string, i:number) => <li key={i}>{s}</li>)}</ul></div>
                            </div>
                        </div>

                        <div className="text-center mt-8 no-print">
                            <button onClick={handleGetGuidance} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3 px-8 rounded-lg hover:shadow-lg transition transform hover:-translate-y-1">
                                Get Step-by-Step Guidance Plan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* GUIDANCE VIEW */}
            {view === 'guidance' && guidanceResult && (
                <div className="space-y-8 animate-fade-in-up" id="guidance-content">
                    <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-800">{guidanceResult.title}</h2>
                        <div className="flex gap-2 no-print">
                            <button onClick={() => downloadPDF('guidance-content', guidanceResult.title)} className="bg-purple-600 text-white px-4 py-2 rounded font-bold text-sm">PDF</button>
                        </div>
                    </div>

                    {guidanceResult.phases.map((phase: any, index: number) => (
                        <div key={index} className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <div className="flex justify-between items-start mb-4 border-b pb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-blue-800">{phase.phaseTitle}</h3>
                                    <p className="text-gray-600 text-sm mt-1">{phase.phaseDescription}</p>
                                </div>
                                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">{phase.timeline}</span>
                            </div>

                            <div className="grid md:grid-cols-3 gap-8">
                                <div className="md:col-span-2">
                                    <h4 className="font-bold text-gray-700 mb-3">Key Tasks</h4>
                                    <ul className="space-y-3">
                                        {phase.keyTasks.map((task: any, i: number) => (
                                            <li key={i} className="flex items-start gap-3 bg-gray-50 p-3 rounded-lg">
                                                <span className={`w-2 h-2 rounded-full mt-2 shrink-0 ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{task.task}</p>
                                                    <p className="text-xs text-gray-500">{task.details}</p>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-700 mb-3 text-center">Budget Allocation</h4>
                                    <div className="h-40 relative">
                                        <canvas id={`budget-chart-${index}`}></canvas>
                                    </div>
                                    <div className="mt-4">
                                        <h4 className="font-bold text-gray-700 mb-2 text-sm">Milestones</h4>
                                        <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                                            {phase.milestones.map((m: string, i: number) => <li key={i}>{m}</li>)}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* QUIZ VIEW */}
            {view === 'quiz' && quizQuestions.length > 0 && (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-lg animate-fade-in-up">
                    <div className="mb-6">
                        <span className="text-sm font-bold text-gray-400 uppercase">Question {currentQIndex + 1} of {quizQuestions.length}</span>
                        <h3 className="text-xl font-bold text-gray-800 mt-2">{quizQuestions[currentQIndex].question}</h3>
                    </div>
                    <div className="space-y-3">
                        {quizQuestions[currentQIndex].options.map((opt: string, i: number) => (
                            <button 
                                key={i} 
                                onClick={() => handleQuizAnswer(opt)}
                                className="w-full text-left p-4 border rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* QUIZ RESULTS VIEW */}
            {view === 'quiz-results' && (
                <div className="animate-fade-in-up">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Business Ideas for You</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {suggestedIdeas.map((idea: any, idx: number) => (
                            <div key={idx} className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition">
                                <h3 className="text-lg font-bold text-blue-700 mb-2">{idea.title}</h3>
                                <p className="text-gray-600 text-sm mb-4">{idea.description}</p>
                                <button 
                                    onClick={() => handleViewDeepDive(idea.title)}
                                    className="text-sm font-bold text-primary-blue hover:underline"
                                >
                                    Get Deep Research Report &rarr;
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="text-center mt-8">
                        <button onClick={() => setView('initial')} className="bg-gray-200 text-gray-700 font-bold py-2 px-6 rounded-lg hover:bg-gray-300">Start Over</button>
                    </div>
                </div>
            )}

            {/* DEEP DIVE VIEW */}
            {view === 'deep-dive' && (
                <div className="bg-white p-8 rounded-2xl shadow-lg animate-fade-in-up" id="deep-dive-content">
                    <div className="flex justify-between items-center mb-6 border-b pb-4">
                        <h2 className="text-2xl font-bold text-gray-900">{deepDiveTitle}</h2>
                        <div className="flex gap-2 no-print">
                            <button onClick={() => handleSave('deep-dive')} className="text-sm bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 font-bold">Save</button>
                            <button onClick={() => downloadPDF('deep-dive-content', deepDiveTitle)} className="text-sm bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 font-bold">PDF</button>
                            <button onClick={() => setView('quiz-results')} className="text-sm bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 font-bold">Back</button>
                        </div>
                    </div>
                    <div className="prose max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: deepDiveContent }}></div>
                </div>
            )}

        </div>
    </div>
  );
};

export default Business;
